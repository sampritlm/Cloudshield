import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Depends, status

from app.models.schemas import (
    SecurityEvent,
    SecurityEventCreate,
    Incident,
    SeverityLevel,
    IncidentStatus,
    StatusUpdateEntry
)
from app.storage import get_storage
from app.engine.detector import engine
from app.aws.eventbridge import publish_to_eventbridge
from app.aws.sqs_handler import enqueue_incident_to_sqs
from app.aws.sns_handler import publish_alert_to_sns
from app.auth import get_current_user, require_analyst_or_admin, UserProfile

router = APIRouter(prefix="/api/events", tags=["Security Events"])

def process_and_ingest_event(event_in: SecurityEventCreate, actor: str = "SYSTEM") -> SecurityEvent:
    """
    Core ingestion pipeline:
    1. Evaluates event with Threat Detection Engine
    2. Explicitly routes event to Amazon EventBridge
    3. Idempotently creates incident for High/Critical threats
    4. Routes High/Critical incidents to Amazon SQS and Amazon SNS
    5. Persists records to Storage (DynamoDB or Local SQLite)
    """
    storage = get_storage()
    now_dt = datetime.now(timezone.utc)
    now_str = now_dt.isoformat()
    event_id = f"evt-{uuid.uuid4().hex[:10]}"

    # Query recent context for windowed correlation
    recent_user_events = storage.get_recent_events_by_user(event_in.test_user, limit=20)
    recent_ip_events = storage.get_recent_events_by_ip(event_in.source_ip, limit=50)

    # Evaluate using rule-based detection engine
    eval_result = engine.evaluate_event(
        event=event_in,
        recent_events_for_user=recent_user_events,
        recent_events_for_ip=recent_ip_events,
        now=now_dt
    )

    triggered_rule_codes = [r.rule_code for r in eval_result.rules_triggered]
    detection_title = "SUSPICIOUS_THREAT" if eval_result.is_threat else "NORMAL_CLEAN"

    # Preliminary event construction
    event = SecurityEvent(
        event_id=event_id,
        timestamp=now_str,
        event_type=event_in.event_type,
        test_user=event_in.test_user,
        source_ip=event_in.source_ip,
        resource=event_in.resource or "api/general",
        action=event_in.action,
        session_id=event_in.session_id,
        request_count=event_in.request_count or 1,
        raw_payload=event_in.raw_payload or {},
        processed=True,
        detection_result=detection_title,
        risk_score=eval_result.risk_score,
        severity=eval_result.severity,
        triggered_rules=triggered_rule_codes,
        detection_reasons=eval_result.reasons,
        processed_by=eval_result.processed_by,
        incident_id=None
    )

    # Explicit EventBridge publishing
    publish_to_eventbridge(event)

    # If risk indicates a threat (High or Critical, or score > 30), idempotently create incident
    if eval_result.is_threat and eval_result.risk_score > 30:
        # Verify idempotency: ensure repeated processing of same event does not create duplicate incidents
        existing_incident = storage.get_incident_by_event_id(event_id)
        if not existing_incident:
            incident_id = f"inc-{uuid.uuid4().hex[:10]}"
            primary_threat_type = (
                eval_result.rules_triggered[0].rule_name
                if eval_result.rules_triggered
                else event.event_type
            )

            new_incident = Incident(
                incident_id=incident_id,
                event_id=event_id,
                threat_type=primary_threat_type,
                severity=eval_result.severity,
                risk_score=eval_result.risk_score,
                test_user=event.test_user,
                source_ip=event.source_ip,
                resource=event.resource,
                detected_at=now_str,
                reasons=eval_result.reasons,
                triggered_rules=triggered_rule_codes,
                status=IncidentStatus.OPEN,
                status_history=[
                    StatusUpdateEntry(
                        from_status=IncidentStatus.OPEN,
                        to_status=IncidentStatus.OPEN,
                        updated_at=now_str,
                        updated_by=f"ThreatDetectionEngine ({eval_result.processed_by})",
                        note="Initial threat detection & incident generation"
                    )
                ],
                processed_by=eval_result.processed_by,
                notified_via_sns=False,
                last_updated_at=now_str
            )

            # Route security incidents to SQS and dispatch SNS alert notification to admin
            sqs_res = enqueue_incident_to_sqs(new_incident)
            if sqs_res.get("message_id"):
                new_incident.sqs_message_id = sqs_res["message_id"]

            sns_res = publish_alert_to_sns(new_incident)
            if sns_res.get("status") in ["PUBLISHED", "SENT_SIMULATED"]:
                new_incident.notified_via_sns = True

            storage.save_incident(new_incident)
            event.incident_id = incident_id

    # Save event
    storage.save_event(event)
    return event

@router.get("")
async def list_events(
    severity: Optional[str] = Query(None, description="Filter by severity: LOW, MEDIUM, HIGH, CRITICAL, ALL"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    search: Optional[str] = Query(None, description="Keyword search in ID, user, IP, action, resource"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    current_user: UserProfile = Depends(require_analyst_or_admin)
):
    """Lists security events with filtering, sorting, and pagination."""
    storage = get_storage()
    offset = (page - 1) * limit
    events, total = storage.list_events(
        severity=severity,
        event_type=event_type,
        search=search,
        limit=limit,
        offset=offset
    )
    return {
        "items": events,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit if limit else 1
    }

@router.get("/{event_id}", response_model=SecurityEvent)
async def get_event_detail(
    event_id: str,
    current_user: UserProfile = Depends(require_analyst_or_admin)
):
    """Retrieves full details for a single security event."""
    storage = get_storage()
    event = storage.get_event(event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Security event '{event_id}' not found"
        )
    return event

@router.post("", response_model=SecurityEvent)
async def ingest_event(
    event_in: SecurityEventCreate,
    current_user: UserProfile = Depends(require_analyst_or_admin)
):
    """Ingests a security event into the CloudShield monitoring pipeline."""
    return process_and_ingest_event(event_in, actor=current_user.email)

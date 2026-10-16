import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, Header, HTTPException, status
from app.config import settings
from app.models.schemas import (
    CanIPhishWebhookPayload,
    SecurityEventCreate,
    SourcePlatform
)
from app.routers.events import process_and_ingest_event
from app.storage import get_storage

logger = logging.getLogger("cloudshield.webhook")
router = APIRouter(prefix="/api/webhooks", tags=["External Ingestion Webhooks"])

@router.post("/caniphish")
async def receive_caniphish_webhook(
    request: Request,
    x_cloudshield_secret: Optional[str] = Header(None, alias="X-CloudShield-Secret"),
    x_webhook_secret: Optional[str] = Header(None, alias="X-Webhook-Secret"),
    authorization: Optional[str] = Header(None)
):
    """
    Publicly reachable HTTPS Webhook endpoint for CanIPhish simulation events.
    Architecture:
    CanIPhish Event -> Webhook -> EventBridge -> Lambda -> DynamoDB -> SQS -> SNS -> Dashboard.
    Validates custom secret header, normalizes payload, runs threat detection,
    and idempotently creates incidents for High/Critical risk scores.
    """
    storage = get_storage()
    now_str = datetime.now(timezone.utc).isoformat()

    # Secret header validation
    provided_secret = x_cloudshield_secret or x_webhook_secret
    if not provided_secret and authorization:
        if authorization.startswith("Bearer "):
            provided_secret = authorization.replace("Bearer ", "")
        else:
            provided_secret = authorization

    expected_secret = settings.CANIPHISH_WEBHOOK_SECRET
    if expected_secret and provided_secret != expected_secret:
        logger.warning(f"Rejected CanIPhish webhook: Invalid or missing secret header. Received: {provided_secret}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing webhook authorization secret header."
        )

    try:
        body: Dict[str, Any] = await request.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed JSON payload: {e}"
        )

    event_name = body.get("eventName", body.get("event", "unknown"))
    employee_email = body.get("employeeEmail") or body.get("targetEmail") or body.get("email") or "unknown.recipient@corp.internal"
    campaign_id = body.get("campaignGUID") or body.get("campaignId") or "CP-CAMPAIGN-DEFAULT"
    campaign_name = body.get("campaignName") or body.get("name") or "CanIPhish Phishing Simulation"
    source_event_id = body.get("eventID") or body.get("id") or body.get("guid") or f"cp-{datetime.now(timezone.utc).timestamp()}"
    source_ip = body.get("ipAddress") or body.get("clientIP") or "0.0.0.0"

    # Map CanIPhish event to human-readable action
    action_map = {
        "payloadClicked": "simulated_phishing_link_clicked",
        "employeeCompromised": "simulated_employee_credential_compromise",
        "emailReported": "simulated_phishing_email_reported",
        "deliveryFailed": "simulated_phishing_delivery_failed",
        "trainingComplete": "security_training_completed",
        "trainingFailed": "security_training_failed",
    }
    action = action_map.get(event_name, f"caniphish_{event_name}")

    # Build normalized security event
    event_in = SecurityEventCreate(
        event_type=event_name,
        test_user=employee_email,
        source_ip=source_ip,
        resource=f"caniphish://campaign/{campaign_id}",
        action=action,
        source_platform=SourcePlatform.CANIPHISH,
        source_event_id=str(source_event_id),
        campaign_id=str(campaign_id),
        campaign_name=str(campaign_name),
        request_count=1,
        raw_payload=body
    )

    # Ingest through monitoring pipeline
    ingested_event = process_and_ingest_event(event_in, actor="CanIPhish Outbound Webhook")

    # Record latest webhook in integration status table
    existing_status = storage.get_integration_status("CanIPhish") or {}
    existing_status.update({
        "last_successful_sync": now_str,
        "latest_webhook_event": {
            "received_at": now_str,
            "event_name": event_name,
            "employee_email": employee_email,
            "campaign_name": campaign_name,
            "risk_score": ingested_event.risk_score,
            "severity": ingested_event.severity.value,
            "event_id": ingested_event.event_id,
            "incident_id": ingested_event.incident_id
        }
    })
    storage.save_integration_status("CanIPhish", existing_status)

    logger.info(
        f"Processed CanIPhish webhook: {event_name} for {employee_email} -> Score: {ingested_event.risk_score} ({ingested_event.severity.value})"
    )

    return {
        "status": "EVENT_PROCESSED",
        "event_id": ingested_event.event_id,
        "source_platform": "CANIPHISH",
        "risk_score": ingested_event.risk_score,
        "severity": ingested_event.severity.value,
        "incident_id": ingested_event.incident_id,
        "received_at": now_str
    }

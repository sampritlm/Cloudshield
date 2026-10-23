from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, require_analyst_or_admin, UserProfile
from app.config import settings
from app.storage import get_storage
from app.models.schemas import SeverityLevel
from app.aws.sns_handler import publish_alert_to_sns

router = APIRouter(prefix="/api/alerts", tags=["Alerts & Notifications"])

class TestAlertRequest(BaseModel):
    subject: Optional[str] = "CloudShield Test Alert"
    message: Optional[str] = "Manual test alert from Administrator Console"

@router.get("")
async def list_alerts(current_user: UserProfile = Depends(require_analyst_or_admin)):
    """
    Returns high and critical incident alerts, Amazon SNS notification dispatch status,
    timestamps, and failure states.
    """
    storage = get_storage()
    incidents, _ = storage.list_incidents(limit=200)

    alerts = []
    for inc in incidents:
        # Include High and Critical severity incidents, or incidents that have been alerted
        if inc.severity in [SeverityLevel.HIGH, SeverityLevel.CRITICAL] or inc.notified_via_sns:
            sns_status = "PUBLISHED" if (settings.AWS_MODE and inc.notified_via_sns) else (
                "SENT_SIMULATED" if inc.notified_via_sns else "PENDING_DELIVERY"
            )

            alerts.append({
                "alert_id": f"alt-{inc.incident_id[:8]}",
                "incident_id": inc.incident_id,
                "threat_type": inc.threat_type,
                "severity": inc.severity.value,
                "risk_score": inc.risk_score,
                "test_user": inc.test_user,
                "source_ip": inc.source_ip,
                "resource": inc.resource,
                "detected_at": inc.detected_at,
                "notified_via_sns": inc.notified_via_sns,
                "sns_status": sns_status,
                "topic_arn": settings.SNS_ALERT_TOPIC_ARN or "arn:aws:sns:us-east-1:123456789012:cloudshield-alerts",
                "sqs_message_id": inc.sqs_message_id,
                "reasons": inc.reasons,
                "incident_status": inc.status.value
            })

    return alerts

@router.post("/test-sns")
async def trigger_test_sns_alert(
    payload: TestAlertRequest,
    current_user: UserProfile = Depends(require_analyst_or_admin)
):
    """
    Dispatches a live or simulated SNS alert test to verify integration connectivity.
    """
    storage = get_storage()
    incidents, total = storage.list_incidents(severity="CRITICAL", limit=1)
    
    if not incidents:
        incidents, _ = storage.list_incidents(limit=1)

    if not incidents:
        return {
            "status": "SENT_SIMULATED",
            "message": "Simulated SNS notification sent successfully (No incidents present to bind).",
            "topic_arn": settings.SNS_ALERT_TOPIC_ARN or "arn:aws:sns:us-east-1:123456789012:cloudshield-alerts",
            "mode": "AWS_SNS" if settings.AWS_MODE else "LOCAL_SIMULATED"
        }

    target_inc = incidents[0]
    res = publish_alert_to_sns(target_inc)
    return {
        "status": res.get("status", "SUCCESS"),
        "message": f"SNS Notification evaluated for incident {target_inc.incident_id}",
        "details": res
    }

class SubscribeEmailRequest(BaseModel):
    email: str

class DirectTestAlertRequest(BaseModel):
    email: str
    subject: Optional[str] = None
    message: Optional[str] = None

@router.get("/subscribers")
async def get_alert_subscribers(current_user: UserProfile = Depends(require_analyst_or_admin)):
    """
    Returns registered email addresses (e.g., Gmail) subscribed to the CloudShield Amazon SNS alert topic.
    """
    from app.aws.sns_handler import list_sns_subscribers
    subscribers = list_sns_subscribers()
    return {
        "topic_arn": settings.SNS_ALERT_TOPIC_ARN or f"arn:aws:sns:{settings.AWS_REGION}:123456789012:cloudshield-alerts",
        "aws_mode": settings.AWS_MODE,
        "region": settings.AWS_REGION,
        "subscribers": subscribers
    }

@router.post("/subscribers")
async def add_alert_subscriber(
    payload: SubscribeEmailRequest,
    current_user: UserProfile = Depends(require_analyst_or_admin)
):
    """
    Subscribes a Gmail or corporate email address to live threat notifications via Amazon SNS.
    """
    from app.aws.sns_handler import subscribe_email_to_sns
    email = payload.email.strip()
    if not email or "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid email address is required (e.g., your-email@gmail.com)"
        )
    result = subscribe_email_to_sns(email)
    return result

@router.delete("/subscribers/{email:path}")
async def remove_alert_subscriber(
    email: str,
    current_user: UserProfile = Depends(require_analyst_or_admin)
):
    """
    Unsubscribes an email address from threat alerts.
    """
    from app.aws.sns_handler import unsubscribe_email_from_sns
    result = unsubscribe_email_from_sns(email.strip())
    return result

@router.post("/send-test-to-email")
async def send_test_to_specific_email(
    payload: DirectTestAlertRequest,
    current_user: UserProfile = Depends(require_analyst_or_admin)
):
    """
    Dispatches an urgent test alert directly targeted to a designated Gmail / corporate email address.
    """
    from app.aws.sns_handler import send_direct_test_alert
    email = payload.email.strip()
    if not email or "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid email address is required"
        )
    result = send_direct_test_alert(email, payload.subject, payload.message)
    return result


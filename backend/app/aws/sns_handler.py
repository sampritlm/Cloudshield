import json
import logging
from typing import Dict, Any
from app.config import settings
from app.aws.client_factory import get_boto3_client
from app.models.schemas import Incident

logger = logging.getLogger("cloudshield.sns")

def publish_alert_to_sns(incident: Incident) -> Dict[str, Any]:
    """
    Sends an urgent threat notification to Amazon SNS Topic for High and Critical severity incidents.
    In local development mode, records a simulated notification.
    """
    subject = f"[CloudShield ALERT] {incident.severity.value} Risk Incident Detected: {incident.threat_type}"
    # Truncate subject to 100 characters per SNS specification
    subject = subject[:98]

    body = (
        f"CLOUDSHIELD AUTOMATED THREAT DETECTION ALERT\n"
        f"===========================================\n"
        f"Incident ID : {incident.incident_id}\n"
        f"Threat Type : {incident.threat_type}\n"
        f"Severity    : {incident.severity.value}\n"
        f"Risk Score  : {incident.risk_score} / 100\n"
        f"Test User   : {incident.test_user}\n"
        f"Source IP   : {incident.source_ip}\n"
        f"Resource    : {incident.resource}\n"
        f"Detected At : {incident.detected_at}\n\n"
        f"Flagged Reasons:\n"
        + "\n".join([f"- {r}" for r in incident.reasons])
        + f"\n\nTriggered Rules:\n"
        + "\n".join([f"- {rule}" for rule in incident.triggered_rules])
        + f"\n\nAction Required: Log in to the CloudShield Administrator Dashboard to inspect and triage this incident."
    )

    if not settings.AWS_MODE:
        logger.info(f"[LOCAL SIMULATION] SNS Notification generated for Incident {incident.incident_id}")
        return {
            "mode": "LOCAL_SIMULATED",
            "topic_arn": settings.SNS_ALERT_TOPIC_ARN or "arn:aws:sns:us-east-1:123456789012:cloudshield-alerts",
            "subject": subject,
            "status": "SENT_SIMULATED",
            "message_id": f"sim-sns-{incident.incident_id[:8]}"
        }

    if not settings.SNS_ALERT_TOPIC_ARN:
        logger.warning("SNS_ALERT_TOPIC_ARN not set. Skipping live SNS publish.")
        return {
            "mode": "SKIPPED",
            "reason": "SNS_ALERT_TOPIC_ARN not configured"
        }

    client = get_boto3_client("sns")
    if not client:
        return {"mode": "ERROR", "error": "SNS client unavailable"}

    try:
        response = client.publish(
            TopicArn=settings.SNS_ALERT_TOPIC_ARN,
            Subject=subject,
            Message=body
        )
        message_id = response.get("MessageId")
        logger.info(f"Published alert to SNS Topic {settings.SNS_ALERT_TOPIC_ARN}, MessageId: {message_id}")
        return {
            "mode": "AWS_SNS",
            "status": "PUBLISHED",
            "topic_arn": settings.SNS_ALERT_TOPIC_ARN,
            "message_id": message_id
        }
    except Exception as e:
        logger.error(f"Failed to publish alert to SNS: {e}")
        return {
            "mode": "ERROR",
            "error": str(e)
        }

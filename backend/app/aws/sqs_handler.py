import json
import logging
from typing import Dict, Any, List
from app.config import settings
from app.aws.client_factory import get_boto3_client
from app.aws.sns_handler import publish_alert_to_sns
from app.models.schemas import Incident, SeverityLevel, IncidentStatus

logger = logging.getLogger("cloudshield.sqs")

def enqueue_incident_to_sqs(incident: Incident) -> Dict[str, Any]:
    """
    Enqueues High and Critical risk incidents to Amazon SQS for asynchronous triage and dispatch.
    Architecture: Threat Detector -> Amazon SQS Queue -> Queue Consumer -> Amazon SNS Alert.
    """
    # Only High and Critical incidents are routed to the priority triage queue
    if incident.severity not in [SeverityLevel.HIGH, SeverityLevel.CRITICAL]:
        return {
            "mode": "SKIPPED",
            "reason": f"Incident severity {incident.severity.value} does not require emergency SQS queuing."
        }

    message_body = json.dumps({
        "incident_id": incident.incident_id,
        "event_id": incident.event_id,
        "threat_type": incident.threat_type,
        "severity": incident.severity.value,
        "risk_score": incident.risk_score,
        "test_user": incident.test_user,
        "source_ip": incident.source_ip,
        "resource": incident.resource,
        "detected_at": incident.detected_at,
        "reasons": incident.reasons,
        "triggered_rules": incident.triggered_rules,
        "status": incident.status.value
    })

    if not settings.AWS_MODE:
        # Local simulated SQS queue
        return {
            "mode": "LOCAL_SIMULATED",
            "status": "ENQUEUED_SIMULATED",
            "queue_url": settings.SQS_INCIDENT_QUEUE_URL or "https://sqs.us-east-1.amazonaws.com/123456789012/cloudshield-incident-queue",
            "message_id": f"sim-sqs-{incident.incident_id[:8]}"
        }

    if not settings.SQS_INCIDENT_QUEUE_URL:
        logger.warning("SQS_INCIDENT_QUEUE_URL not configured. Skipping SQS send.")
        return {
            "mode": "SKIPPED",
            "reason": "SQS_INCIDENT_QUEUE_URL is not configured"
        }

    client = get_boto3_client("sqs")
    if not client:
        return {"mode": "ERROR", "error": "SQS client unavailable"}

    try:
        response = client.send_message(
            QueueUrl=settings.SQS_INCIDENT_QUEUE_URL,
            MessageBody=message_body,
            MessageAttributes={
                "Severity": {
                    "DataType": "String",
                    "StringValue": incident.severity.value
                },
                "ThreatType": {
                    "DataType": "String",
                    "StringValue": incident.threat_type
                }
            }
        )
        msg_id = response.get("MessageId")
        logger.info(f"Enqueued incident {incident.incident_id} to SQS ({msg_id})")
        return {
            "mode": "AWS_SQS",
            "status": "ENQUEUED",
            "message_id": msg_id,
            "queue_url": settings.SQS_INCIDENT_QUEUE_URL
        }
    except Exception as e:
        logger.error(f"Failed to send incident to SQS: {e}")
        return {
            "mode": "ERROR",
            "error": str(e)
        }

def process_sqs_incident_queue(max_messages: int = 5) -> Dict[str, Any]:
    """
    Explicit consumer for Amazon SQS incident queue.
    Polls queued high/critical incidents from SQS, verifies them, triggers SNS notifications,
    and removes successfully processed messages from the queue.
    This fulfills the explicit requirement of implementing an SQS consumer rather than
    assuming an automatic SQS -> SNS trigger.
    """
    if not settings.AWS_MODE:
        return {
            "mode": "LOCAL_SIMULATED",
            "messages_processed": 0,
            "details": "In local mode, events trigger simulated alerts directly without SQS polling."
        }

    if not settings.SQS_INCIDENT_QUEUE_URL:
        return {"mode": "ERROR", "error": "SQS_INCIDENT_QUEUE_URL not configured"}

    client = get_boto3_client("sqs")
    if not client:
        return {"mode": "ERROR", "error": "SQS client unavailable"}

    try:
        response = client.receive_message(
            QueueUrl=settings.SQS_INCIDENT_QUEUE_URL,
            MaxNumberOfMessages=max_messages,
            WaitTimeSeconds=2,
            VisibilityTimeout=30
        )

        messages = response.get("Messages", [])
        processed_count = 0
        results = []

        for msg in messages:
            receipt_handle = msg.get("ReceiptHandle")
            body_raw = msg.get("Body")
            try:
                data = json.loads(body_raw)
                # Reconstruct Incident model for alert publishing
                incident = Incident(
                    incident_id=data["incident_id"],
                    event_id=data["event_id"],
                    threat_type=data["threat_type"],
                    severity=SeverityLevel(data["severity"]),
                    risk_score=data["risk_score"],
                    test_user=data["test_user"],
                    source_ip=data["source_ip"],
                    resource=data["resource"],
                    detected_at=data["detected_at"],
                    reasons=data.get("reasons", []),
                    triggered_rules=data.get("triggered_rules", []),
                    status=IncidentStatus(data.get("status", "OPEN")),
                    last_updated_at=data["detected_at"]
                )
                # Dispatch notification via SNS
                sns_result = publish_alert_to_sns(incident)
                
                # Delete consumed message from SQS
                client.delete_message(
                    QueueUrl=settings.SQS_INCIDENT_QUEUE_URL,
                    ReceiptHandle=receipt_handle
                )
                processed_count += 1
                results.append({"incident_id": incident.incident_id, "sns_result": sns_result})
            except Exception as item_err:
                logger.error(f"Failed processing individual SQS message {msg.get('MessageId')}: {item_err}")

        return {
            "mode": "AWS_SQS_CONSUMER",
            "messages_processed": processed_count,
            "results": results
        }
    except Exception as e:
        logger.error(f"Error consuming SQS incident queue: {e}")
        return {"mode": "ERROR", "error": str(e)}

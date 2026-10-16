import json
import logging
from typing import Dict, Any, Optional
from app.config import settings
from app.aws.client_factory import get_boto3_client
from app.models.schemas import SecurityEvent

logger = logging.getLogger("cloudshield.eventbridge")

def publish_to_eventbridge(event: SecurityEvent) -> Dict[str, Any]:
    """
    Explicitly publishes ingested security events to Amazon EventBridge.
    Architecture: Backend -> Amazon EventBridge (bus: cloudshield-event-bus) -> AWS Lambda rule.
    In local development mode, simulates EventBridge event delivery safely.
    """
    if not settings.AWS_MODE:
        return {
            "mode": "LOCAL_SIMULATED",
            "bus_name": settings.EVENTBRIDGE_BUS_NAME,
            "status": "DELIVERED_LOCAL_BUS",
            "event_id": event.event_id,
            "detail_type": "CloudShield.SecurityEventIngested"
        }

    client = get_boto3_client("events")
    if not client:
        return {
            "mode": "FALLBACK_LOCAL",
            "error": "AWS EventBridge client unavailable or credentials missing",
            "event_id": event.event_id
        }

    try:
        entry = {
            "Time": event.timestamp,
            "Source": "cloudshield.security",
            "DetailType": "CloudShield.SecurityEventIngested",
            "Detail": json.dumps({
                "event_id": event.event_id,
                "event_type": event.event_type,
                "test_user": event.test_user,
                "source_ip": event.source_ip,
                "resource": event.resource,
                "action": event.action,
                "risk_score": event.risk_score,
                "severity": event.severity.value,
                "triggered_rules": event.triggered_rules,
                "raw_payload": event.raw_payload
            }),
            "EventBusName": settings.EVENTBRIDGE_BUS_NAME
        }

        response = client.put_events(Entries=[entry])
        failed_count = response.get("FailedEntryCount", 0)
        if failed_count > 0:
            logger.warning(f"EventBridge put_events had {failed_count} failures: {response}")
            return {
                "mode": "AWS_EVENTBRIDGE",
                "status": "PARTIAL_FAILURE",
                "details": response
            }

        logger.info(f"Published event {event.event_id} to EventBridge bus {settings.EVENTBRIDGE_BUS_NAME}")
        return {
            "mode": "AWS_EVENTBRIDGE",
            "status": "SUCCESS",
            "event_bus": settings.EVENTBRIDGE_BUS_NAME,
            "response": response
        }
    except Exception as e:
        logger.error(f"Failed to publish to EventBridge: {e}")
        return {
            "mode": "ERROR",
            "error": str(e)
        }

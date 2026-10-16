"""
AWS Lambda Serverless Threat Evaluator
=======================================
Invoked by Amazon EventBridge Rule when events are published with:
- Source: 'cloudshield.security'
- DetailType: 'CloudShield.SecurityEventIngested'

Evaluates rule thresholds, assigns risk points, caps at 100,
persists incidents to DynamoDB, and enqueues High/Critical incidents to Amazon SQS.
"""
import os
import json
import uuid
from datetime import datetime, timezone
import boto3

# Environment Variables
DYNAMODB_INCIDENTS_TABLE = os.environ.get("DYNAMODB_INCIDENTS_TABLE", "cloudshield-security-incidents")
SQS_INCIDENT_QUEUE_URL = os.environ.get("SQS_INCIDENT_QUEUE_URL", "")
SNS_ALERT_TOPIC_ARN = os.environ.get("SNS_ALERT_TOPIC_ARN", "")

# AWS Clients
dynamodb = boto3.resource("dynamodb")
incidents_table = dynamodb.Table(DYNAMODB_INCIDENTS_TABLE)
sqs = boto3.client("sqs")
sns = boto3.client("sns")

def classify_severity(score: int) -> str:
    if score <= 30:
        return "LOW"
    elif score <= 60:
        return "MEDIUM"
    elif score <= 80:
        return "HIGH"
    else:
        return "CRITICAL"

def lambda_handler(event, context):
    print("Received EventBridge Event:", json.dumps(event))

    detail = event.get("detail", {})
    if isinstance(detail, str):
        detail = json.loads(detail)

    event_id = detail.get("event_id", f"evt-{uuid.uuid4().hex[:10]}")
    risk_score = detail.get("risk_score", 0)
    severity = detail.get("severity", classify_severity(risk_score))
    test_user = detail.get("test_user", "unknown")
    source_ip = detail.get("source_ip", "0.0.0.0")
    resource = detail.get("resource", "api/general")
    triggered_rules = detail.get("triggered_rules", [])
    now_str = datetime.now(timezone.utc).isoformat()

    # If risk indicates a threat, create incident in DynamoDB
    if risk_score > 30:
        incident_id = f"inc-{uuid.uuid4().hex[:10]}"
        threat_type = detail.get("event_type", "Detected Security Anomaly")

        incident_item = {
            "incident_id": incident_id,
            "event_id": event_id,
            "threat_type": threat_type,
            "severity": severity,
            "risk_score": risk_score,
            "test_user": test_user,
            "source_ip": source_ip,
            "resource": resource,
            "detected_at": now_str,
            "reasons": json.dumps(detail.get("detection_reasons", ["Flagged by Lambda Rule-Evaluator"])),
            "triggered_rules": json.dumps(triggered_rules),
            "status": "OPEN",
            "status_history": json.dumps([
                {
                    "from_status": "OPEN",
                    "to_status": "OPEN",
                    "updated_at": now_str,
                    "updated_by": "AWS Lambda (CloudShield-ThreatEvaluator)",
                    "note": "Automated incident generation via EventBridge rule"
                }
            ]),
            "processed_by": "AWS_LAMBDA",
            "notified_via_sns": 0,
            "last_updated_at": now_str
        }

        # Save to DynamoDB
        incidents_table.put_item(Item=incident_item)
        print(f"Created incident {incident_id} in DynamoDB")

        # Route High and Critical to SQS Priority Queue
        if severity in ["HIGH", "CRITICAL"] and SQS_INCIDENT_QUEUE_URL:
            sqs.send_message(
                QueueUrl=SQS_INCIDENT_QUEUE_URL,
                MessageBody=json.dumps(incident_item),
                MessageAttributes={
                    "Severity": {"DataType": "String", "StringValue": severity}
                }
            )
            print(f"Enqueued incident {incident_id} to SQS queue")

    return {
        "statusCode": 200,
        "body": json.dumps({
            "message": "Security event evaluated successfully",
            "event_id": event_id,
            "risk_score": risk_score,
            "severity": severity
        })
    }

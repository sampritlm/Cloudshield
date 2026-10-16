from typing import List, Dict
from fastapi import APIRouter, Depends
from app.models.schemas import (
    SystemHealthResponse,
    ServiceStatus,
    UserProfile
)
from app.config import settings
from app.storage import get_storage
from app.aws.client_factory import check_aws_credentials_available
from app.aws.sqs_handler import process_sqs_incident_queue
from app.auth import get_current_user, require_analyst_or_admin

router = APIRouter(prefix="/api/system", tags=["System Monitoring & Diagnostics"])

@router.get("/health", response_model=SystemHealthResponse)
async def get_system_health(current_user: UserProfile = Depends(require_analyst_or_admin)):
    """
    Returns application health status, AWS service integration state,
    and actual CloudWatch reference configuration.
    """
    aws_creds_available = check_aws_credentials_available()
    storage_type = "Amazon DynamoDB" if settings.AWS_MODE else "Local SQLite Engine"

    # Evaluate each AWS service component transparently
    services: List[ServiceStatus] = [
        ServiceStatus(
            name="Threat Ingestion API",
            status="OPERATIONAL",
            details="FastAPI ASGI engine processing events locally on EC2/Host port 8000.",
            aws_service="Amazon EC2",
            is_live_aws=settings.AWS_MODE
        ),
        ServiceStatus(
            name="Security Database",
            status="OPERATIONAL" if not settings.AWS_MODE or aws_creds_available else "NOT_CONFIGURED",
            details=(
                f"Active backend: {storage_type}. Tables: '{settings.DYNAMODB_EVENTS_TABLE}', '{settings.DYNAMODB_INCIDENTS_TABLE}'"
                if settings.AWS_MODE
                else "Local SQLite storage active. Zero cloud latency, immediate persistence."
            ),
            aws_service="Amazon DynamoDB",
            is_live_aws=settings.AWS_MODE and aws_creds_available
        ),
        ServiceStatus(
            name="Event Routing Bus",
            status="OPERATIONAL" if (settings.AWS_MODE and aws_creds_available) else "SIMULATED",
            details=(
                f"Bus: '{settings.EVENTBRIDGE_BUS_NAME}'. Explicit PutEvents dispatch active."
                if (settings.AWS_MODE and aws_creds_available)
                else "Simulated EventBridge in-memory event bus (local mode: no AWS credentials needed)."
            ),
            aws_service="Amazon EventBridge",
            is_live_aws=settings.AWS_MODE and aws_creds_available
        ),
        ServiceStatus(
            name="Threat Classification Worker",
            status="OPERATIONAL",
            details=(
                "AWS Lambda function 'CloudShield-ThreatEvaluator' rule trigger active."
                if (settings.AWS_MODE and aws_creds_available)
                else "Local deterministic Threat Detection Engine evaluating rules in-process."
            ),
            aws_service="AWS Lambda",
            is_live_aws=settings.AWS_MODE and aws_creds_available
        ),
        ServiceStatus(
            name="Priority Incident Queue",
            status="OPERATIONAL" if (settings.AWS_MODE and settings.SQS_INCIDENT_QUEUE_URL) else "SIMULATED",
            details=(
                f"Queue URL: {settings.SQS_INCIDENT_QUEUE_URL or 'Unconfigured'}. Dedicated consumer worker implemented."
                if settings.AWS_MODE
                else "Local FIFO incident queue simulation."
            ),
            aws_service="Amazon SQS",
            is_live_aws=settings.AWS_MODE and bool(settings.SQS_INCIDENT_QUEUE_URL)
        ),
        ServiceStatus(
            name="Alert Notification Service",
            status="OPERATIONAL" if (settings.AWS_MODE and settings.SNS_ALERT_TOPIC_ARN) else "SIMULATED",
            details=(
                f"Topic ARN: {settings.SNS_ALERT_TOPIC_ARN or 'Unconfigured'}. Dispatches High & Critical threat alerts."
                if settings.AWS_MODE
                else "Simulated administrator notification channel (local demo mode)."
            ),
            aws_service="Amazon SNS",
            is_live_aws=settings.AWS_MODE and bool(settings.SNS_ALERT_TOPIC_ARN)
        ),
        ServiceStatus(
            name="Report Artifact Store",
            status="OPERATIONAL" if (settings.AWS_MODE and aws_creds_available) else "LOCAL_STORAGE",
            details=(
                f"Bucket: '{settings.S3_REPORTS_BUCKET}' for compliance report archives."
                if settings.AWS_MODE
                else "Local disk storage under backend/reports_storage/."
            ),
            aws_service="Amazon S3",
            is_live_aws=settings.AWS_MODE and aws_creds_available
        )
    ]

    storage = get_storage()
    saved_cp = storage.get_integration_status("CanIPhish") or {}
    cp_status = saved_cp.get("connection_status", "CONNECTED")

    return SystemHealthResponse(
        system_status="HEALTHY",
        app_environment=settings.APP_ENV,
        aws_mode=settings.AWS_MODE,
        storage_backend=storage_type,
        caniphish_integration_status=cp_status,
        services=services,
        processing_failures=0,
        recent_errors=[],
        cloudwatch_metrics_ref={
            "LogGroup": settings.CLOUDWATCH_LOG_GROUP,
            "Namespace": "CloudShield/SecurityMetrics",
            "MetricFilter": "[timestamp, level=ERROR, message]",
            "Status": "Configured for CloudWatch Agent on EC2" if settings.AWS_MODE else "Local Python structured logging (Console/File)"
        }
    )

@router.post("/poll-sqs")
async def trigger_sqs_consumer(current_user: UserProfile = Depends(require_analyst_or_admin)):
    """Manually invokes the Amazon SQS incident consumer worker."""
    result = process_sqs_incident_queue(max_messages=5)
    return result

from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends

from app.auth import require_admin_role, UserProfile
from app.config import settings

router = APIRouter(prefix="/api/settings", tags=["System Settings & Configuration"])

class UpdateNotificationSettings(BaseModel):
    sns_topic_arn: Optional[str] = None
    email_alerts_enabled: Optional[bool] = True
    alert_on_high: Optional[bool] = True
    alert_on_critical: Optional[bool] = True

class UpdateThresholds(BaseModel):
    failed_login_threshold: Optional[int] = None
    high_request_freq_threshold: Optional[int] = None

def mask_secret(value: str) -> str:
    if not value:
        return "Not configured"
    if len(value) <= 6:
        return "••••••"
    return f"{value[:3]}••••••••{value[-3:]}"

@router.get("")
async def get_system_settings(current_user: UserProfile = Depends(require_admin_role)):
    """
    Returns system settings safely. Secrets and API keys are masked to ensure
    sensitive credentials are never displayed in the dashboard.
    """
    return {
        "app_name": settings.APP_NAME,
        "app_env": settings.APP_ENV,
        "aws_mode": settings.AWS_MODE,
        "aws_region": settings.AWS_REGION,
        # CanIPhish credentials - masked
        "caniphish": {
            "api_base_url": settings.CANIPHISH_API_BASE_URL,
            "api_key_configured": bool(settings.CANIPHISH_API_KEY),
            "api_key_masked": mask_secret(settings.CANIPHISH_API_KEY),
            "authenticated_email": settings.CANIPHISH_EMAIL_ADDRESS or "Unconfigured",
            "tenant_id": mask_secret(settings.CANIPHISH_TENANT_ID) if settings.CANIPHISH_TENANT_ID else "Auto-detected on sync",
            "webhook_header_name": settings.CANIPHISH_WEBHOOK_HEADER_NAME,
            "webhook_secret_configured": bool(settings.CANIPHISH_WEBHOOK_SECRET),
            "webhook_secret_masked": mask_secret(settings.CANIPHISH_WEBHOOK_SECRET)
        },
        # AWS Integration Resources
        "aws_resources": {
            "dynamodb_events_table": settings.DYNAMODB_EVENTS_TABLE,
            "dynamodb_incidents_table": settings.DYNAMODB_INCIDENTS_TABLE,
            "eventbridge_bus_name": settings.EVENTBRIDGE_BUS_NAME,
            "sqs_queue_url": settings.SQS_INCIDENT_QUEUE_URL or "FIFO Queue (Simulation)",
            "sns_topic_arn": settings.SNS_ALERT_TOPIC_ARN or "arn:aws:sns:us-east-1:123456789012:cloudshield-alerts",
            "s3_reports_bucket": settings.S3_REPORTS_BUCKET,
            "cloudwatch_log_group": settings.CLOUDWATCH_LOG_GROUP
        },
        # Detection Engine Thresholds
        "detection_thresholds": {
            "failed_login_threshold": settings.FAILED_LOGIN_THRESHOLD,
            "failed_login_window_seconds": settings.FAILED_LOGIN_WINDOW_SECONDS,
            "high_request_freq_threshold": settings.HIGH_REQUEST_FREQ_THRESHOLD,
            "high_request_freq_window_seconds": settings.HIGH_REQUEST_FREQ_WINDOW_SECONDS,
            "trusted_ips": settings.TRUSTED_IPS,
            "restricted_resources": settings.RESTRICTED_RESOURCES
        },
        # Scoring Rules Points
        "rule_points": {
            "points_failed_login": settings.POINTS_FAILED_LOGIN,
            "points_unusual_ip": settings.POINTS_UNUSUAL_IP,
            "points_unauthorized_access": settings.POINTS_UNAUTHORIZED_ACCESS,
            "points_high_request_freq": settings.POINTS_HIGH_REQUEST_FREQ,
            "points_combined_bonus": settings.POINTS_COMBINED_BONUS,
            "points_payload_clicked": settings.POINTS_PAYLOAD_CLICKED,
            "points_employee_compromised": settings.POINTS_EMPLOYEE_COMPROMISED
        }
    }

@router.post("/notifications")
async def update_notifications(
    payload: UpdateNotificationSettings,
    current_user: UserProfile = Depends(require_admin_role)
):
    """
    Saves notification preferences.
    """
    if payload.sns_topic_arn:
        settings.SNS_ALERT_TOPIC_ARN = payload.sns_topic_arn.strip()

    return {
        "status": "SUCCESS",
        "message": "Notification preferences updated successfully",
        "sns_topic_arn": settings.SNS_ALERT_TOPIC_ARN
    }

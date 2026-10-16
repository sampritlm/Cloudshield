from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "CloudShield"
    APP_ENV: str = "development"
    AWS_MODE: bool = False
    AWS_REGION: str = "us-east-1"
    
    # Secret Key for JWT auth
    SECRET_KEY: str = "cloudshield-dev-secret-key-college-project-2026-very-secure"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    # AWS DynamoDB Tables
    DYNAMODB_EVENTS_TABLE: str = "cloudshield-security-events"
    DYNAMODB_INCIDENTS_TABLE: str = "cloudshield-security-incidents"
    DYNAMODB_INTEGRATION_TABLE: str = "cloudshield-integration-status"
    
    # AWS Integration Resources
    EVENTBRIDGE_BUS_NAME: str = "cloudshield-event-bus"
    SQS_INCIDENT_QUEUE_URL: str = ""
    SNS_ALERT_TOPIC_ARN: str = ""
    S3_REPORTS_BUCKET: str = "cloudshield-security-reports"
    CLOUDWATCH_LOG_GROUP: str = "/aws/cloudshield/security-monitoring"
    
    # CanIPhish API v3 Integration
    CANIPHISH_API_KEY: str = ""
    CANIPHISH_EMAIL_ADDRESS: str = ""
    CANIPHISH_TENANT_ID: str = ""
    CANIPHISH_API_BASE_URL: str = "https://api.caniphish.com/api/v3"
    CANIPHISH_WEBHOOK_SECRET: str = "cloudshield-caniphish-secure-token-2026"
    CANIPHISH_WEBHOOK_HEADER_NAME: str = "X-CloudShield-Secret"

    # Detection Rules Configuration
    POINTS_PAYLOAD_CLICKED: int = 30
    POINTS_EMPLOYEE_COMPROMISED: int = 50
    POINTS_COMBINED_INTERACTION_BONUS: int = 20
    POINTS_COMBINED_BONUS: int = 20
    POINTS_FAILED_LOGIN: int = 40
    POINTS_UNUSUAL_IP: int = 25
    POINTS_UNAUTHORIZED_ACCESS: int = 45
    POINTS_HIGH_REQUEST_FREQ: int = 35

    FAILED_LOGIN_THRESHOLD: int = 5
    FAILED_LOGIN_WINDOW_SECONDS: int = 300
    HIGH_REQUEST_FREQ_THRESHOLD: int = 20
    HIGH_REQUEST_FREQ_WINDOW_SECONDS: int = 60
    
    TRUSTED_IPS: List[str] = [
        "127.0.0.1",
        "192.168.1.100",
        "10.0.0.50",
        "::1"
    ]
    
    RESTRICTED_RESOURCES: List[str] = [
        "/admin/secrets",
        "/api/v1/iam/credentials",
        "/aws/kms/master-key",
        "/database/backup/master.sql",
        "s3://corp-confidential/keys",
        "/var/secrets/tokens"
    ]

settings = Settings()

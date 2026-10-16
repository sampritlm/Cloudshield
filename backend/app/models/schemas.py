from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class UserRole(str, Enum):
    ADMIN = "admin"
    ANALYST = "analyst"
    USER = "user"

class SeverityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class IncidentStatus(str, Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"

class SourcePlatform(str, Enum):
    CANIPHISH = "CANIPHISH"
    LOCAL_SIMULATION = "LOCAL_SIMULATION"

# Auth Models
class UserCredentials(BaseModel):
    email: str
    password: str

class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    created_at: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[UserRole] = None

# Threat Detection Engine Models
class RuleTriggerResult(BaseModel):
    rule_name: str
    rule_code: str
    description: str
    points: int
    details: Dict[str, Any] = Field(default_factory=dict)

class DetectionResult(BaseModel):
    is_threat: bool
    risk_score: int
    severity: SeverityLevel
    reasons: List[str]
    rules_triggered: List[RuleTriggerResult]
    processed_by: str = "LOCAL_SIMULATOR"
    source_platform: SourcePlatform = SourcePlatform.LOCAL_SIMULATION

# Security Event Models
class SecurityEventCreate(BaseModel):
    event_type: str
    test_user: str
    source_ip: str = "0.0.0.0"
    action: str
    resource: Optional[str] = "api/phishing-simulation"
    source_platform: SourcePlatform = SourcePlatform.LOCAL_SIMULATION
    source_event_id: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    session_id: Optional[str] = None
    request_count: Optional[int] = 1
    raw_payload: Optional[Dict[str, Any]] = Field(default_factory=dict)

class SecurityEvent(BaseModel):
    event_id: str
    timestamp: str
    event_type: str
    test_user: str
    source_ip: str
    resource: str
    action: str
    source_platform: SourcePlatform = SourcePlatform.LOCAL_SIMULATION
    source_event_id: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    session_id: Optional[str] = None
    request_count: Optional[int] = 1
    raw_payload: Dict[str, Any] = Field(default_factory=dict)
    processed: bool = True
    detection_result: str = "CLEAN"
    risk_score: int = 0
    severity: SeverityLevel = SeverityLevel.LOW
    triggered_rules: List[str] = Field(default_factory=list)
    detection_reasons: List[str] = Field(default_factory=list)
    processed_by: str = "LOCAL_SIMULATOR"
    incident_id: Optional[str] = None

# Incident Models
class StatusUpdateEntry(BaseModel):
    from_status: IncidentStatus
    to_status: IncidentStatus
    updated_at: str
    updated_by: str
    note: Optional[str] = ""

class Incident(BaseModel):
    incident_id: str
    event_id: str
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    threat_type: str
    severity: SeverityLevel
    risk_score: int
    test_user: str
    source_ip: str
    resource: str
    detected_at: str
    reasons: List[str]
    triggered_rules: List[str]
    status: IncidentStatus = IncidentStatus.OPEN
    status_history: List[StatusUpdateEntry] = Field(default_factory=list)
    processed_by: str = "LOCAL_ENGINE"
    source_platform: SourcePlatform = SourcePlatform.LOCAL_SIMULATION
    notified_via_sns: bool = False
    sqs_message_id: Optional[str] = None
    last_updated_at: str

class IncidentStatusUpdate(BaseModel):
    status: IncidentStatus
    note: Optional[str] = ""

# CanIPhish Models
class CanIPhishEntitlements(BaseModel):
    isAdmin: bool = False
    isWriteEntitled: bool = False
    isEnterpriseEntitled: bool = False
    planName: str = "Unknown"
    apiQuota: int = 0
    apiQuotaUsed: int = 0
    employeeQuota: int = 0
    employeeQuotaUsed: int = 0
    quotaRemaining: Optional[int] = None

class CanIPhishCampaign(BaseModel):
    campaignGUID: str
    campaignName: str
    status: str
    createdDate: Optional[str] = None
    scheduledDate: Optional[str] = None
    targetsCount: int = 0
    payloadInteractions: int = 0
    employeesCompromised: int = 0
    emailsReported: int = 0
    deliveryFailed: int = 0
    caniphishUrl: Optional[str] = None

class IntegrationStatusInfo(BaseModel):
    integration_name: str = "CanIPhish"
    connection_status: str  # "CONNECTED", "CREDENTIALS_MISSING", "AUTH_FAILED", "ERROR"
    api_base_url: str = "https://api.caniphish.com/api/v3"
    tenant_id: Optional[str] = None
    authenticated_email: Optional[str] = None
    is_admin: bool = False
    is_write_entitled: bool = False
    is_enterprise_entitled: bool = False
    plan_name: Optional[str] = None
    remaining_api_quota: Optional[int] = None
    api_quota_limit: Optional[int] = None
    api_quota_used: Optional[int] = None
    last_successful_sync: Optional[str] = None
    last_error: Optional[str] = None
    latest_webhook_event: Optional[Dict[str, Any]] = None
    webhook_url: Optional[str] = None
    webhook_configured: bool = False
    missing_entitlements: List[str] = Field(default_factory=list)
    setup_instructions: List[str] = Field(default_factory=list)

class CanIPhishWebhookPayload(BaseModel):
    eventName: str  # "payloadClicked", "employeeCompromised", "emailReported", "deliveryFailed", etc.
    tenantID: Optional[str] = None
    campaignGUID: Optional[str] = None
    campaignName: Optional[str] = None
    employeeEmail: Optional[str] = None
    targetEmail: Optional[str] = None
    timestamp: Optional[str] = None
    ipAddress: Optional[str] = None
    userAgent: Optional[str] = None
    eventData: Optional[Dict[str, Any]] = Field(default_factory=dict)

# Dashboard & Analytics Models
class DashboardSummary(BaseModel):
    total_events: int
    detected_threats: int
    high_risk_incidents: int
    critical_incidents: int
    open_incidents: int
    resolved_incidents: int
    investigating_incidents: int
    # CanIPhish specific metrics
    caniphish_events_count: int = 0
    caniphish_campaigns_count: int = 0
    caniphish_payload_clicks: int = 0
    caniphish_compromises: int = 0
    caniphish_emails_reported: int = 0
    last_alert_time: Optional[str] = None
    aws_mode: bool = False
    storage_type: str = "Local SQLite"
    caniphish_status: str = "DISCONNECTED"

class TimeSeriesPoint(BaseModel):
    timestamp: str = ""
    events_count: int = 0
    threats_count: int = 0

class DistributionItem(BaseModel):
    name: str
    value: int
    color: Optional[str] = None

# System Monitoring Models
class ServiceStatus(BaseModel):
    name: str
    status: str
    details: str
    aws_service: str
    is_live_aws: bool

class SystemHealthResponse(BaseModel):
    system_status: str
    app_environment: str
    aws_mode: bool
    storage_backend: str
    caniphish_integration_status: str = "CONNECTED"
    services: List[ServiceStatus]
    processing_failures: int
    recent_errors: List[str] = Field(default_factory=list)
    cloudwatch_metrics_ref: Dict[str, str]

# Report Generation Models
class ReportRequest(BaseModel):
    title: Optional[str] = "CloudShield Comprehensive Security Audit Report"

class ReportSummary(BaseModel):
    report_id: str
    generated_at: str
    generated_by: str
    total_events: int
    caniphish_events_count: int = 0
    threat_categories: Dict[str, int]
    severity_distribution: Dict[str, int]
    risk_score_stats: Dict[str, float]
    open_incidents_count: int
    resolved_incidents_count: int
    stored_in_s3: bool
    s3_key: Optional[str] = None

# Threat Simulator Models
class SimulatorScenario(str, Enum):
    FAILED_LOGIN = "FAILED_LOGIN"
    UNUSUAL_IP = "UNUSUAL_IP"
    UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS"
    HIGH_REQUEST_FREQUENCY = "HIGH_REQUEST_FREQUENCY"
    COMBINED_SUSPICIOUS = "COMBINED_SUSPICIOUS"

class ThreatSimulatorRequest(BaseModel):
    scenario: SimulatorScenario
    test_user: Optional[str] = None
    source_ip: Optional[str] = None
    resource: Optional[str] = None
    custom_attempts: Optional[int] = None

class ThreatSimulatorResponse(BaseModel):
    scenario: SimulatorScenario
    scenario_title: str
    event_id: str
    status: str
    detection_result: str
    risk_score: int
    severity: SeverityLevel
    triggered_rules: List[str] = Field(default_factory=list)
    detection_reasons: List[str] = Field(default_factory=list)
    incident_created: bool
    incident_id: Optional[str] = None
    message: str
    execution_mode: str

# User Access Containment & Control Models
class UserAccessStatusType(str, Enum):
    ALLOWED = "ALLOWED"
    BLOCKED = "BLOCKED"
    SUSPENDED = "SUSPENDED"

class UserAccessStatus(BaseModel):
    user_identifier: str
    status: UserAccessStatusType = UserAccessStatusType.ALLOWED
    reason: Optional[str] = None
    suspended_until: Optional[str] = None
    duration_minutes: Optional[int] = None
    updated_at: str
    updated_by: str
    is_active_suspension: bool = False

class UserAccessActionRequest(BaseModel):
    action: UserAccessStatusType
    duration_minutes: Optional[int] = 60
    reason: Optional[str] = None
    incident_id: Optional[str] = None
    event_id: Optional[str] = None

class UserAccessActionResponse(BaseModel):
    success: bool
    user_identifier: str
    status: UserAccessStatusType
    message: str
    suspended_until: Optional[str] = None
    duration_minutes: Optional[int] = None
    updated_at: str
    updated_by: str


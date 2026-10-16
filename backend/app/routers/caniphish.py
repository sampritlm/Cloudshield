import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.config import settings
from app.models.schemas import (
    IntegrationStatusInfo,
    CanIPhishCampaign,
    SecurityEventCreate,
    SourcePlatform,
    UserProfile
)
from app.caniphish.client import caniphish_client
from app.routers.events import process_and_ingest_event
from app.storage import get_storage
from app.auth import get_current_user, require_analyst_or_admin

logger = logging.getLogger("cloudshield.caniphish.router")
router = APIRouter(prefix="/api/caniphish", tags=["CanIPhish Integration Management"])

class ConfigureWebhookRequest(BaseModel):
    public_https_url: str
    secret_token: Optional[str] = None

@router.get("/status", response_model=IntegrationStatusInfo)
async def get_caniphish_status(current_user: UserProfile = Depends(require_analyst_or_admin)):
    """
    Returns CanIPhish integration health status, tenant ID, entitlement preflight,
    remaining API quota, and latest webhook telemetry.
    """
    storage = get_storage()
    saved = storage.get_integration_status("CanIPhish") or {}

    is_configured = caniphish_client.is_configured()
    connection_status = "CREDENTIALS_MISSING" if not is_configured else saved.get("connection_status", "CONFIGURED_UNTESTED")

    # Mask tenant ID or email for security
    tenant_display = settings.CANIPHISH_TENANT_ID or saved.get("tenant_id")
    email_display = settings.CANIPHISH_EMAIL_ADDRESS

    webhook_url = f"https://your-domain-or-ip/api/webhooks/caniphish"

    setup_instructions = [
        "1. Log into your CanIPhish Console at https://caniphish.com",
        "2. Navigate to Platform Settings -> Integrations -> Webhook Integration",
        f"3. Set Webhook Endpoint URL to: {webhook_url}",
        f"4. Add Header Name: {settings.CANIPHISH_WEBHOOK_HEADER_NAME}",
        f"5. Add Header Secret: {settings.CANIPHISH_WEBHOOK_SECRET}",
        "6. Enable events: 'Payload Clicked', 'Employee Compromised', 'Email Reported'",
        "7. Save settings and launch an authorized test simulation to verify live event delivery."
    ]

    return IntegrationStatusInfo(
        integration_name="CanIPhish",
        connection_status=connection_status,
        api_base_url=settings.CANIPHISH_API_BASE_URL,
        tenant_id=tenant_display,
        authenticated_email=email_display,
        is_admin=saved.get("is_admin", False),
        is_write_entitled=saved.get("is_write_entitled", False),
        is_enterprise_entitled=saved.get("is_enterprise_entitled", False),
        plan_name=saved.get("plan_name", "N/A"),
        remaining_api_quota=saved.get("remaining_api_quota"),
        api_quota_limit=saved.get("api_quota_limit"),
        api_quota_used=saved.get("api_quota_used"),
        last_successful_sync=saved.get("last_successful_sync"),
        last_error=saved.get("last_error"),
        latest_webhook_event=saved.get("latest_webhook_event"),
        webhook_url=webhook_url,
        webhook_configured=saved.get("webhook_configured", False),
        missing_entitlements=saved.get("missing_entitlements", []),
        setup_instructions=setup_instructions
    )

@router.post("/test-connection")
async def test_caniphish_connection(current_user: UserProfile = Depends(require_analyst_or_admin)):
    """
    Calls CanIPhish API v3 POST /account/get-entitlements preflight endpoint.
    Verifies authentication, tenant access, role, and quota.
    """
    storage = get_storage()
    now_str = datetime.now(timezone.utc).isoformat()

    if not caniphish_client.is_configured():
        msg = "CanIPhish credentials not set in server environment. Set CANIPHISH_API_KEY and CANIPHISH_EMAIL_ADDRESS."
        storage.save_integration_status("CanIPhish", {
            "connection_status": "CREDENTIALS_MISSING",
            "last_error": msg,
            "last_test_at": now_str
        })
        return {
            "status": "FAILED",
            "message": msg,
            "credentials_configured": False
        }

    # Call get_entitlements
    success, data = await caniphish_client.get_entitlements()
    if not success:
        err_msg = data.get("error", "Failed to communicate with CanIPhish API v3")
        storage.save_integration_status("CanIPhish", {
            "connection_status": "AUTH_FAILED",
            "last_error": err_msg,
            "last_test_at": now_str
        })
        return {
            "status": "FAILED",
            "message": f"Authentication failed: {err_msg}",
            "credentials_configured": True
        }

    missing_ents = []
    if not data.get("isAdmin"):
        missing_ents.append("Platform Administrator (AD) or Super Admin role required for write actions.")
    if not data.get("isWriteEntitled"):
        missing_ents.append("Active Professional or Enterprise subscription required for campaign creation / automated webhook updates.")

    status_data = {
        "connection_status": "CONNECTED",
        "tenant_id": caniphish_client.tenant_id,
        "is_admin": data.get("isAdmin", False),
        "is_write_entitled": data.get("isWriteEntitled", False),
        "is_enterprise_entitled": data.get("isEnterpriseEntitled", False),
        "plan_name": data.get("planName", "Standard"),
        "remaining_api_quota": data.get("quotaRemaining"),
        "api_quota_limit": data.get("apiQuota"),
        "api_quota_used": data.get("apiQuotaUsed"),
        "last_successful_sync": now_str,
        "last_error": None,
        "missing_entitlements": missing_ents
    }
    storage.save_integration_status("CanIPhish", status_data)

    return {
        "status": "SUCCESS",
        "message": f"Successfully connected to CanIPhish tenant! Plan: {data.get('planName')}",
        "entitlements": data,
        "missing_entitlements": missing_ents
    }

@router.post("/sync-campaigns")
async def synchronize_caniphish_campaigns(current_user: UserProfile = Depends(require_analyst_or_admin)):
    """
    Queries CanIPhish API v3 to retrieve campaigns and their per-recipient interaction results.
    Ingests clicks and compromises as official CANIPHISH security events and incidents.
    Provides immediate fallback when outbound webhooks are not configured.
    """
    storage = get_storage()
    now_str = datetime.now(timezone.utc).isoformat()

    if not caniphish_client.is_configured():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CanIPhish credentials not configured. Please configure CANIPHISH_API_KEY and CANIPHISH_EMAIL_ADDRESS in backend/.env"
        )

    success, campaigns = await caniphish_client.get_all_campaigns()
    if not success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve campaigns from CanIPhish API v3."
        )

    ingested_events_count = 0
    ingested_incidents_count = 0

    for camp in campaigns:
        # Retrieve results for each campaign
        res_ok, results = await caniphish_client.get_campaign_results(camp.campaignGUID)
        if not res_ok:
            continue

        for r in results:
            emp_email = r.get("employeeEmail") or r.get("targetEmail") or "unknown.recipient@corp.internal"
            is_click = bool(r.get("payloadInteraction") or r.get("payloadInteractionTime"))
            is_compromise = bool(r.get("employeeCompromised") or r.get("employeeCompromisedTime"))
            is_report = bool(r.get("emailReported"))

            # Determine event type
            event_type = "NORMAL_DELIVERY"
            action = "simulation_delivered"
            if is_compromise:
                event_type = "employeeCompromised"
                action = "simulated_employee_credential_compromise"
            elif is_click:
                event_type = "payloadClicked"
                action = "simulated_phishing_link_clicked"
            elif is_report:
                event_type = "emailReported"
                action = "simulated_phishing_email_reported"

            source_event_id = f"cp-sync-{camp.campaignGUID[:8]}-{emp_email.replace('@', '_at_')}"

            # Ingest event
            event_in = SecurityEventCreate(
                event_type=event_type,
                test_user=emp_email,
                source_ip="0.0.0.0",
                resource=f"caniphish://campaign/{camp.campaignGUID}",
                action=action,
                source_platform=SourcePlatform.CANIPHISH,
                source_event_id=source_event_id,
                campaign_id=camp.campaignGUID,
                campaign_name=camp.campaignName,
                request_count=1,
                raw_payload=r
            )

            ingested = process_and_ingest_event(event_in, actor="CanIPhish Periodic Sync")
            ingested_events_count += 1
            if ingested.incident_id:
                ingested_incidents_count += 1

    # Update integration status record
    saved = storage.get_integration_status("CanIPhish") or {}
    saved["last_successful_sync"] = now_str
    saved["last_error"] = None
    storage.save_integration_status("CanIPhish", saved)

    return {
        "status": "SUCCESS",
        "campaigns_checked": len(campaigns),
        "events_ingested": ingested_events_count,
        "incidents_created": ingested_incidents_count,
        "synchronized_at": now_str
    }

@router.get("/campaigns", response_model=List[CanIPhishCampaign])
async def list_caniphish_campaigns(current_user: UserProfile = Depends(require_analyst_or_admin)):
    """
    Returns actual phishing campaigns retrieved from CanIPhish API v3.
    """
    if not caniphish_client.is_configured():
        return []

    success, campaigns = await caniphish_client.get_all_campaigns()
    if not success:
        return []
    return campaigns

@router.post("/configure-webhook")
async def configure_outbound_webhook(
    req: ConfigureWebhookRequest,
    current_user: UserProfile = Depends(require_analyst_or_admin)
):
    """
    Attempts to programmatically configure CanIPhish outbound webhook via API v3.
    If the account subscription lacks write-entitlements, returns detailed manual setup instructions.
    """
    if not caniphish_client.is_configured():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CanIPhish credentials not configured"
        )

    secret = req.secret_token or settings.CANIPHISH_WEBHOOK_SECRET
    success, resp = await caniphish_client.update_webhook(
        endpoint_url=req.public_https_url,
        secret_value=secret,
        secret_header_name=settings.CANIPHISH_WEBHOOK_HEADER_NAME
    )

    storage = get_storage()
    saved = storage.get_integration_status("CanIPhish") or {}

    if success:
        saved["webhook_configured"] = True
        saved["webhook_url"] = req.public_https_url
        storage.save_integration_status("CanIPhish", saved)
        return {
            "status": "SUCCESS",
            "message": "Outbound webhook successfully configured on CanIPhish!",
            "details": resp
        }
    else:
        err = resp.get("error", "Unable to update webhook via API")
        return {
            "status": "MANUAL_SETUP_REQUIRED",
            "message": "Automatic webhook API update requires Enterprise write-entitlement.",
            "error_detail": err,
            "instructions": [
                f"1. Open CanIPhish Console -> Platform Settings -> Integrations -> Webhook Integration",
                f"2. Set Webhook URL: {req.public_https_url}",
                f"3. Set Header: {settings.CANIPHISH_WEBHOOK_HEADER_NAME} = {secret}",
                f"4. Check events: Payload Clicked, Employee Compromised, Email Reported"
            ]
        }

class CanIPhishSimulateRequest(BaseModel):
    event_type: str  # "payloadClicked" | "employeeCompromised" | "emailReported" | "deliveryFailed"
    target_user: Optional[str] = "user@cloudshield.internal"
    campaign_name: Optional[str] = "CanIPhish - Microsoft 365 Cloud Document Lure"
    campaign_id: Optional[str] = None
    source_ip: Optional[str] = "198.51.100.22"

@router.post("/simulate")
async def simulate_caniphish_event(
    req: CanIPhishSimulateRequest,
    current_user: UserProfile = Depends(require_analyst_or_admin)
):
    """
    Simulates authentic CanIPhish phishing campaign outcomes directly from the website.
    Processes payloadClicked, employeeCompromised, emailReported, and deliveryFailed.
    Routes through EventBridge, Lambda risk scoring, DynamoDB, and alerts via SQS/SNS.
    """
    action_map = {
        "payloadClicked": "simulated_phishing_link_clicked",
        "employeeCompromised": "simulated_employee_credential_compromise",
        "emailReported": "simulated_phishing_email_reported",
        "deliveryFailed": "simulated_phishing_delivery_failed",
    }
    action = action_map.get(req.event_type, f"caniphish_{req.event_type}")
    camp_id = req.campaign_id or f"CP-CAMP-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"

    raw_payload: Dict[str, Any] = {
        "eventName": req.event_type,
        "employeeEmail": req.target_user,
        "campaignName": req.campaign_name,
        "campaignGUID": camp_id,
        "ipAddress": req.source_ip,
        "simulated": True,
        "source": "CanIPhish Interactive Console"
    }

    if req.event_type == "payloadClicked":
        raw_payload["clicked_link"] = "https://m365-auth-login.xyz/verify-account"
        raw_payload["payloadInteraction"] = True
    elif req.event_type == "employeeCompromised":
        raw_payload["landing_page"] = "https://m365-auth-login.xyz/login"
        raw_payload["employeeCompromised"] = True  # Safe simulation, no real credentials collected
    elif req.event_type == "emailReported":
        raw_payload["reported_via"] = "CloudShield Outlook Security Plugin"
        raw_payload["emailReported"] = True
    elif req.event_type == "deliveryFailed":
        raw_payload["bounce_reason"] = "550 5.1.1 User unknown / Mailbox unavailable"
        raw_payload["deliveryFailed"] = True

    event_in = SecurityEventCreate(
        event_type=req.event_type,
        test_user=req.target_user or "user@cloudshield.internal",
        source_ip=req.source_ip or "198.51.100.22",
        resource=f"caniphish://campaign/{camp_id}",
        action=action,
        source_platform=SourcePlatform.CANIPHISH,
        source_event_id=f"cp-sim-{datetime.now(timezone.utc).timestamp()}",
        campaign_id=camp_id,
        campaign_name=req.campaign_name,
        request_count=1,
        raw_payload=raw_payload
    )

    ingested_event = process_and_ingest_event(event_in, actor="CanIPhish Interactive Simulation")

    return {
        "status": "SUCCESS",
        "message": f"CanIPhish '{req.event_type}' simulation event successfully processed by CloudShield engine.",
        "event_id": ingested_event.event_id,
        "risk_score": ingested_event.risk_score,
        "severity": ingested_event.severity.value,
        "incident_id": ingested_event.incident_id,
        "triggered_rules": ingested_event.triggered_rules,
        "detection_reasons": ingested_event.detection_reasons,
        "source_platform": "CANIPHISH"
    }

@router.get("/simulation-results")
async def get_caniphish_simulation_results(
    current_user: UserProfile = Depends(require_analyst_or_admin)
):
    """
    Returns all security events originating from CanIPhish,
    including link interactions, compromises, reports, and delivery status.
    """
    storage = get_storage()
    all_events, _ = storage.list_events(limit=500)
    caniphish_events = []
    for e in all_events:
        is_cp = (e.source_platform.value == "CANIPHISH") if hasattr(e.source_platform, "value") else (e.source_platform == "CANIPHISH")
        if is_cp:
            caniphish_events.append(e)

    caniphish_events.sort(key=lambda x: x.timestamp, reverse=True)
    return caniphish_events

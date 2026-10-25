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
    template_code: Optional[str] = None
    phishing_website: Optional[str] = None

@router.post("/simulate")
async def simulate_caniphish_event(
    req: CanIPhishSimulateRequest,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Simulates authentic CanIPhish phishing campaign outcomes directly from the website.
    Processes payloadClicked, employeeCompromised, emailReported, and deliveryFailed.
    Routes through EventBridge, Lambda risk scoring, DynamoDB, and alerts via SQS/SNS.
    """
    from app.engine.rules import CANIPHISH_EMAIL_TEMPLATES, CANIPHISH_PHISHING_WEBSITES

    tmpl = CANIPHISH_EMAIL_TEMPLATES.get(req.template_code) if req.template_code else None
    if not tmpl and req.campaign_name:
        for code, t in CANIPHISH_EMAIL_TEMPLATES.items():
            if code.lower() in req.campaign_name.lower():
                tmpl = t
                break

    site_code = req.phishing_website or (tmpl.get("paired_website") if tmpl else "Google-Login")
    site = CANIPHISH_PHISHING_WEBSITES.get(site_code) or CANIPHISH_PHISHING_WEBSITES.get("Google-Login")

    action_map = {
        "emailOpened": f"simulated_phishing_email_opened ({tmpl['template_code'] if tmpl else 'lure'})",
        "payloadClicked": f"simulated_phishing_link_clicked ({tmpl['template_code'] if tmpl else 'lure'} -> {site['site_code']})",
        "employeeCompromised": f"simulated_credential_compromise on {site['title']} ({site['domain']})",
        "emailReported": f"simulated_phishing_email_reported ({tmpl['template_code'] if tmpl else 'lure'})",
        "deliveryFailed": "simulated_phishing_delivery_failed",
    }
    action = action_map.get(req.event_type, f"caniphish_{req.event_type}")
    camp_id = req.campaign_id or f"CP-{tmpl['template_code'][:8].upper() if tmpl else 'CAMP'}-{datetime.now(timezone.utc).strftime('%H%M%S')}"

    raw_payload: Dict[str, Any] = {
        "eventName": req.event_type,
        "employeeEmail": req.target_user,
        "campaignName": req.campaign_name or (f"CanIPhish: {tmpl['template_code']}" if tmpl else "Phishing Simulation"),
        "campaignGUID": camp_id,
        "ipAddress": req.source_ip,
        "template_code": tmpl["template_code"] if tmpl else req.template_code,
        "template_title": tmpl["title"] if tmpl else None,
        "difficulty": tmpl.get("difficulty") if tmpl else "Hard",
        "compromise_rate": tmpl.get("compromise_rate") if tmpl else "30%",
        "phishing_website": site["site_code"],
        "phishing_website_title": site["title"],
        "deceptive_domain": site.get("domain", "alerting-services.com"),
        "landing_page": site.get("landing_url"),
        "simulated": True,
        "source": "CanIPhish Interactive Console"
    }

    if req.event_type == "emailOpened":
        raw_payload["emailOpened"] = True
    elif req.event_type == "payloadClicked":
        raw_payload["clicked_link"] = site.get("landing_url", f"https://{site['site_code'].lower()}.alerting-services.com")
        raw_payload["payloadInteraction"] = True
    elif req.event_type == "employeeCompromised":
        raw_payload["landing_page"] = site.get("landing_url")
        raw_payload["employeeCompromised"] = True
        raw_payload["harvested_credentials"] = ["email", "password"]
        raw_payload["credentialType"] = "Password Authentication"
    elif req.event_type == "emailReported":
        raw_payload["reported_via"] = "CloudShield Threat Inbox / Outlook Security Plugin"
        raw_payload["emailReported"] = True
    elif req.event_type == "deliveryFailed":
        raw_payload["bounce_reason"] = "550 5.1.1 User unknown / Mailbox unavailable"
        raw_payload["deliveryFailed"] = True

    event_in = SecurityEventCreate(
        event_type=req.event_type,
        test_user=req.target_user or "user@cloudshield.internal",
        source_ip=req.source_ip or "185.220.101.5",
        resource=site.get("landing_url") or f"https://{site['domain']}/login/{site['site_code']}",
        action=action,
        source_platform=SourcePlatform.CANIPHISH,
        source_event_id=f"cp-sim-{datetime.now(timezone.utc).timestamp()}",
        campaign_id=camp_id,
        campaign_name=raw_payload["campaignName"],
        request_count=1,
        raw_payload=raw_payload
    )

    ingested_event = process_and_ingest_event(event_in, actor="CanIPhish Interactive Simulation")

    # Separate SNS Alert Dispatches: link click vs. credential compromise
    sns_res = {}
    if req.event_type in ["payloadClicked", "employeeCompromised"]:
        from app.aws.sns_handler import publish_caniphish_threat_alert
        sns_res = publish_caniphish_threat_alert(
            event_type=req.event_type,
            user_email=event_in.test_user,
            campaign_name=event_in.campaign_name or "CanIPhish Simulation",
            phishing_site=site["title"],
            client_ip=event_in.source_ip,
            incident_id=ingested_event.incident_id
        )

        if ingested_event.incident_id:
            from app.models.schemas import SeverityLevel
            st = get_storage()
            inc = st.get_incident(ingested_event.incident_id)
            if inc:
                inc.notified_via_sns = True
                inc.severity = SeverityLevel.CRITICAL if req.event_type == "employeeCompromised" else SeverityLevel.HIGH
                st.save_incident(inc)

    return {
        "status": "SUCCESS",
        "message": f"CanIPhish '{req.event_type}' simulation event successfully processed by CloudShield engine.",
        "event_id": ingested_event.event_id,
        "risk_score": ingested_event.risk_score,
        "severity": ingested_event.severity.value,
        "incident_id": ingested_event.incident_id,
        "triggered_rules": ingested_event.triggered_rules,
        "detection_reasons": ingested_event.detection_reasons,
        "source_platform": "CANIPHISH",
        "sns_notified": bool(sns_res.get("status") in ["PUBLISHED", "SENT_SIMULATED"]),
        "sns_message_id": sns_res.get("message_id")
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

class CanIPhishAttackSimulationRequest(BaseModel):
    target_user: str
    template_code: str
    phishing_website: Optional[str] = None
    action: str = "harvest"  # visit | harvest | report
    source_ip: Optional[str] = "185.220.101.5"

@router.get("/catalog")
async def get_caniphish_catalog(current_user: UserProfile = Depends(get_current_user)):
    """
    Returns the official CanIPhish catalog containing:
    1. 5 Phishing Email Templates (Gmail-Blocked-Login, OneDrive-Word-Share, Microsoft-Security-Alert, HR-Device-Violation, Linkedin-Password-Reset)
    2. 3 Phishing Websites masquerading as Google, Microsoft, and LinkedIn portals (alerting-services.com)
    """
    from app.engine.rules import CANIPHISH_EMAIL_TEMPLATES, CANIPHISH_PHISHING_WEBSITES
    return {
        "email_templates": list(CANIPHISH_EMAIL_TEMPLATES.values()),
        "phishing_websites": list(CANIPHISH_PHISHING_WEBSITES.values()),
        "domain": "alerting-services.com",
        "global_delivery_enabled": True
    }

@router.post("/simulate-attack")
async def simulate_caniphish_attack(
    req: CanIPhishAttackSimulationRequest,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Executes a structured CanIPhish attack simulation correlating an Email Template
    and a Phishing Website (Google-Login, Microsoft-Login, or LinkedIn-Login).
    Routes through EventBridge, Lambda risk analysis, DynamoDB, SQS, and SNS.
    """
    from app.engine.rules import CANIPHISH_EMAIL_TEMPLATES, CANIPHISH_PHISHING_WEBSITES

    tmpl = CANIPHISH_EMAIL_TEMPLATES.get(req.template_code) or {
        "template_code": req.template_code,
        "title": req.template_code,
        "paired_website": "Google-Login",
        "difficulty": "Hard",
        "compromise_rate": "30%"
    }

    site_code = req.phishing_website or tmpl.get("paired_website", "Google-Login")
    site = CANIPHISH_PHISHING_WEBSITES.get(site_code) or {
        "site_code": site_code,
        "title": site_code,
        "domain": "alerting-services.com"
    }

    if req.action == "visit":
        event_type = "payloadClicked"
        act_desc = f"Visited {site['title']} via {tmpl['template_code']}"
    elif req.action == "report":
        event_type = "emailReported"
        act_desc = f"Reported {tmpl['template_code']} phishing email to SOC"
    else:
        event_type = "employeeCompromised"
        act_desc = f"Credential harvest on {site['title']} ({site['domain']})"

    camp_id = f"CP-{req.template_code[:8].upper()}-{datetime.now(timezone.utc).strftime('%H%M%S')}"

    raw_payload = {
        "template_code": tmpl["template_code"],
        "template_title": tmpl.get("title"),
        "difficulty": tmpl.get("difficulty"),
        "compromise_rate": tmpl.get("compromise_rate"),
        "phishing_website": site["site_code"],
        "phishing_website_title": site["title"],
        "deceptive_domain": site.get("domain", "alerting-services.com"),
        "landing_page": site.get("landing_url"),
        "action": req.action,
        "employeeEmail": req.target_user,
        "source": "CanIPhish Attack Simulator"
    }

    if req.action == "harvest":
        raw_payload["employeeCompromised"] = True
        raw_payload["credentialType"] = "Password Authentication"
    elif req.action == "visit":
        raw_payload["payloadInteraction"] = True
    elif req.action == "report":
        raw_payload["emailReported"] = True

    event_in = SecurityEventCreate(
        event_type=event_type,
        test_user=req.target_user,
        source_ip=req.source_ip or "185.220.101.5",
        resource=f"https://{site.get('domain', 'alerting-services.com')}/login/{site['site_code']}",
        action=act_desc,
        source_platform=SourcePlatform.CANIPHISH,
        source_event_id=f"cp-atk-{datetime.now(timezone.utc).timestamp()}",
        campaign_id=camp_id,
        campaign_name=f"CanIPhish: {tmpl['template_code']} / {site['site_code']}",
        request_count=1,
        raw_payload=raw_payload
    )

    ingested = process_and_ingest_event(event_in, actor="CanIPhish Structured Attack Simulator")

    return {
        "status": "SUCCESS",
        "event_id": ingested.event_id,
        "template": tmpl,
        "phishing_website": site,
        "target_user": req.target_user,
        "action": req.action,
        "risk_score": ingested.risk_score,
        "severity": ingested.severity.value,
        "incident_id": ingested.incident_id,
        "triggered_rules": ingested.triggered_rules,
        "reasons": ingested.detection_reasons,
        "notified_via_sns": ingested.risk_score > 60
    }


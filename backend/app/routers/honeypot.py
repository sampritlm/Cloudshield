import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.responses import JSONResponse, PlainTextResponse

from app.models.schemas import (
    HoneypotStatusResponse,
    HoneypotDecoyInfo,
    HoneypotTriggerTestRequest,
    SecurityEventCreate,
    UserProfile
)
from app.engine.rules import HONEYPOT_DECOY_CATALOG, RULE_HONEYPOT_TRIGGERED
from app.routers.events import process_and_ingest_event
from app.storage import get_storage
from app.auth import get_current_user, require_analyst_or_admin
from app.config import settings

router = APIRouter(tags=["Honeypot Deception Technology"])

def _extract_client_ip(request: Request) -> str:
    client_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "127.0.0.1")
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    return client_ip

def _trigger_honeypot_event(
    resource_path: str,
    request: Request,
    decoy_id: Optional[str] = None,
    custom_actor: Optional[str] = None,
    extra_details: Optional[Dict[str, Any]] = None
):
    """
    Standardized trigger method for all honeypot decoys.
    Captures forensic details and routes directly to the detection engine.
    """
    client_ip = _extract_client_ip(request)
    user_agent = request.headers.get("user-agent", "Unknown-Scanner/1.0")
    now_iso = datetime.now(timezone.utc).isoformat()

    decoy_meta = HONEYPOT_DECOY_CATALOG.get(decoy_id or "") or {
        "name": "Deception Asset Probe",
        "category": "Reconnaissance Trap",
        "description": "Unauthorized access to decoy asset",
        "risk_points": getattr(settings, "POINTS_HONEYPOT_TRIGGERED", 90),
        "threat_level": "CRITICAL"
    }

    actor = custom_actor or f"prober_{client_ip.replace('.', '_').replace(':', '_')}"

    payload = {
        "is_honeypot": True,
        "decoy_id": decoy_id,
        "decoy_name": decoy_meta["name"],
        "decoy_category": decoy_meta["category"],
        "target_endpoint": resource_path,
        "method": request.method,
        "user_agent": user_agent,
        "captured_headers": {k: v for k, v in list(request.headers.items())[:8]},
        "timestamp": now_iso
    }
    if extra_details:
        payload.update(extra_details)

    event_in = SecurityEventCreate(
        event_type="HONEYPOT_TRIGGERED",
        test_user=actor,
        source_ip=client_ip,
        resource=resource_path,
        action="honeypot_trap_accessed",
        request_count=1,
        raw_payload=payload
    )

    event = process_and_ingest_event(event_in, actor="SYSTEM_HONEYPOT")
    return event

# =========================================================================
# Management & Analytics APIs (Admin / Analyst Protected)
# =========================================================================

@router.get("/api/honeypot/status", response_model=HoneypotStatusResponse)
async def get_honeypot_status(current_user: UserProfile = Depends(require_analyst_or_admin)):
    """
    Returns deception technology operational health, active traps,
    hit counters, trapped attacker IPs, and latest incident references.
    """
    storage = get_storage()
    events, total = storage.list_events(limit=200)

    # Filter honeypot events
    honeypot_events = [
        e for e in events
        if e.event_type in ["HONEYPOT_TRIGGERED", "HONEYPOT_TRAP", "HONEYTOKEN_TRIGGERED"]
        or "honeypot" in (e.action or "").lower()
        or (e.raw_payload and e.raw_payload.get("is_honeypot"))
    ]

    # Map hits per decoy
    hits_per_endpoint: Dict[str, int] = {}
    last_hit_per_endpoint: Dict[str, str] = {}
    trapped_ips = set()
    latest_incident_id = None

    for ev in honeypot_events:
        res = (ev.resource or "").lower()
        hits_per_endpoint[res] = hits_per_endpoint.get(res, 0) + 1
        if res not in last_hit_per_endpoint or ev.timestamp > last_hit_per_endpoint[res]:
            last_hit_per_endpoint[res] = ev.timestamp
        if ev.source_ip and ev.source_ip != "0.0.0.0":
            trapped_ips.add(ev.source_ip)
        if ev.incident_id and not latest_incident_id:
            latest_incident_id = ev.incident_id

    decoys_list: List[HoneypotDecoyInfo] = []
    for d_id, d_cfg in HONEYPOT_DECOY_CATALOG.items():
        ep = d_cfg["endpoint"].lower()
        hits = hits_per_endpoint.get(ep, 0)
        last_hit = last_hit_per_endpoint.get(ep)
        decoys_list.append(
            HoneypotDecoyInfo(
                id=d_id,
                name=d_cfg["name"],
                endpoint=d_cfg["endpoint"],
                category=d_cfg["category"],
                description=d_cfg["description"],
                risk_points=d_cfg["risk_points"],
                threat_level=d_cfg["threat_level"],
                total_hits=hits,
                last_hit_at=last_hit
            )
        )

    return HoneypotStatusResponse(
        enabled=True,
        total_traps_active=len(HONEYPOT_DECOY_CATALOG),
        total_hits_recorded=len(honeypot_events),
        trapped_ips_count=len(trapped_ips),
        recent_trapped_ips=list(trapped_ips)[:10],
        decoys=decoys_list,
        latest_incident_id=latest_incident_id
    )

@router.get("/api/honeypot/decoys", response_model=List[HoneypotDecoyInfo])
async def list_honeypot_decoys(current_user: UserProfile = Depends(require_analyst_or_admin)):
    """Lists all configured deceptive honeypot traps and canary assets."""
    status_resp = await get_honeypot_status(current_user)
    return status_resp.decoys

@router.post("/api/honeypot/trigger-test")
async def trigger_test_probe(
    req: HoneypotTriggerTestRequest,
    request: Request,
    current_user: UserProfile = Depends(require_analyst_or_admin)
):
    """
    Safely triggers a simulated honeypot trap interaction from the management UI.
    Immediately creates a CRITICAL security incident and logs the attacker telemetry.
    """
    decoy_cfg = HONEYPOT_DECOY_CATALOG.get(req.decoy_id or "DECOY_AWS_KEYS")
    endpoint = req.custom_endpoint or (decoy_cfg["endpoint"] if decoy_cfg else "/api/v1/internal/aws-keys")

    client_ip = req.source_ip or _extract_client_ip(request)
    event_in = SecurityEventCreate(
        event_type="HONEYPOT_TRIGGERED",
        test_user=f"simulated_scanner_{client_ip.replace('.', '_')}",
        source_ip=client_ip,
        resource=endpoint,
        action="honeypot_trap_accessed",
        request_count=1,
        raw_payload={
            "is_honeypot": True,
            "decoy_id": req.decoy_id,
            "decoy_name": decoy_cfg["name"] if decoy_cfg else "Custom Decoy Probe",
            "scanner_signature": req.simulated_scanner or "Manual-Test-UI",
            "simulation_scenario": "Honeypot Trap Interaction",
            "triggered_by": current_user.email
        }
    )

    event = process_and_ingest_event(event_in, actor=current_user.email)

    return {
        "status": "SUCCESS",
        "message": f"Honeypot decoy '{endpoint}' triggered successfully.",
        "event_id": event.event_id,
        "incident_id": event.incident_id,
        "risk_score": event.risk_score,
        "severity": event.severity.value,
        "deception_rule": RULE_HONEYPOT_TRIGGERED
    }

@router.post("/api/honeypot/interact")
async def record_decoy_interaction(
    request: Request,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Called from the Decoy Dashboard when attacker browses or interacts with ANY resource:
    - Navigating tabs (Security Events, Incident Management, Reports, etc.)
    - Viewing/exporting decoy tables, reports, or AWS keys
    - Searching or filtering decoy logs
    Captures live reconnaissance telemetry and emits a CRITICAL security event to the SOC.
    """
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass

    interaction_type = body.get("interaction_type", "resource_access")
    custom_resource = body.get("resource")
    custom_action = body.get("action")
    target_name = body.get("target_name") or interaction_type

    client_ip = _extract_client_ip(request)

    resource_map = {
        "download_canary_key": "/decoy/download_canary_iam_key",
        "query_decoy_table": "/decoy/rds/aurora-prod-customer-vault",
        "inspect_template": "/decoy/cloudformation/vpc-sandbox-trap.yaml",
        "view_events": "/decoy/api/v1/security-events",
        "view_incidents": "/decoy/api/v1/incidents",
        "view_reports": "/decoy/reports/audit-export",
        "export_csv": "/decoy/reports/cloudshield-security-audit.csv",
        "view_system": "/decoy/system/aws-monitoring",
        "view_users": "/decoy/users/iam-access-keys",
        "view_settings": "/decoy/settings/aws-credentials",
        "tab_navigation": f"/decoy/console/{body.get('tab', 'overview')}"
    }

    action_map = {
        "download_canary_key": "DECOY_CANARY_KEY_DOWNLOADED",
        "query_decoy_table": "DECOY_DATABASE_QUERIED",
        "inspect_template": "DECOY_TEMPLATE_INSPECTED",
        "view_events": "DECOY_SECURITY_EVENTS_PROBED",
        "view_incidents": "DECOY_INCIDENTS_INSPECTED",
        "view_reports": "DECOY_REPORTS_AUDITED",
        "export_csv": "DECOY_AUDIT_CSV_EXFILTRATED",
        "view_system": "DECOY_AWS_INFRASTRUCTURE_PROBED",
        "view_users": "DECOY_IAM_USERS_PROBED",
        "view_settings": "DECOY_SECURITY_CONFIG_ACCESSED",
        "tab_navigation": f"DECOY_TAB_NAVIGATED_{str(body.get('tab', 'UNKNOWN')).upper()}"
    }

    target_resource = custom_resource or resource_map.get(interaction_type, f"/decoy/resource/{interaction_type}")
    action_name = custom_action or action_map.get(interaction_type, "DECOY_RESOURCE_ACCESSED")

    event_in = SecurityEventCreate(
        event_type="HONEYPOT_TRIGGER",
        test_user=current_user.email,
        source_ip=client_ip,
        resource=target_resource,
        action=action_name,
        request_count=1,
        raw_payload={
            "is_honeypot": True,
            "interaction_type": interaction_type,
            "target_resource": target_resource,
            "action": action_name,
            "target_name": target_name,
            "sandbox_node": "AWS ap-south-1 • VPC ID: vpc-sandbox-trap-001",
            "attacker_session": current_user.email,
            "client_headers": dict(request.headers),
            "simulated_forensic_alert": True
        }
    )

    event = process_and_ingest_event(event_in, actor=current_user.email)

    return {
        "status": "SUCCESS",
        "event_id": event.event_id,
        "incident_id": event.incident_id,
        "risk_score": event.risk_score,
        "severity": event.severity.value,
        "resource": target_resource,
        "action": action_name
    }

# =========================================================================
# Realistic Trap Decoy Endpoints (Public Facing Traps)
# =========================================================================

@router.api_route("/.env", methods=["GET", "POST"])
async def trap_env_file(request: Request):
    """
    Decoy .env file trap. Scanners constantly probe for exposed .env files.
    Triggers immediate CRITICAL incident and returns realistic fake credentials.
    """
    _trigger_honeypot_event("/.env", request, decoy_id="DECOY_ENV_FILE")
    # Return realistic decoy configuration with canary values
    fake_env = (
        "# CloudShield Environment Configuration (DECOY)\n"
        "APP_ENV=production\n"
        "AWS_REGION=us-east-1\n"
        "AWS_ACCESS_KEY_ID=AKIA_CANARY_TRAP_SECRET_KEY_99\n"
        "DATABASE_URL=postgres://cloudshield_admin:Tr4pP@ssw0rd2026@internal-db.corp.local:5432/production\n"
        "JWT_SECRET=canary_token_do_not_use_0192837465\n"
    )
    return PlainTextResponse(content=fake_env, status_code=200)

@router.api_route("/api/v1/internal/aws-keys", methods=["GET", "POST"])
async def trap_aws_keys(request: Request):
    """
    Decoy AWS Credentials endpoint. Catch internal reconnaissance or crawlers.
    """
    _trigger_honeypot_event("/api/v1/internal/aws-keys", request, decoy_id="DECOY_AWS_KEYS")
    return JSONResponse(
        status_code=403,
        content={
            "error": "AccessDeniedException",
            "message": "User: arn:aws:iam::123456789012:user/canary-deployer is not authorized to perform: iam:GetAccessKey",
            "canary_token_tracked": True,
            "incident_logged": True
        }
    )

@router.api_route("/api/v1/admin/db-backup", methods=["GET", "POST"])
async def trap_db_backup(request: Request):
    """
    Decoy database dump / backup endpoint.
    """
    _trigger_honeypot_event("/api/v1/admin/db-backup", request, decoy_id="DECOY_DB_BACKUP")
    return JSONResponse(
        status_code=401,
        content={
            "status": "UNAUTHORIZED_BACKUP_ACCESS",
            "error": "Master backup export requires multi-party biometric authorization",
            "security_warning": "Unauthorized exfiltration attempt recorded"
        }
    )

@router.api_route("/actuator/env", methods=["GET", "POST"])
async def trap_actuator(request: Request):
    """
    Decoy Spring Boot actuator endpoint.
    """
    _trigger_honeypot_event("/actuator/env", request, decoy_id="DECOY_ACTUATOR_ENV")
    return JSONResponse(
        status_code=200,
        content={
            "activeProfiles": ["production", "cloud"],
            "propertySources": [
                {"name": "systemEnvironment", "properties": {"CANARY_STATUS": {"value": "TRAPPED"}}}
            ]
        }
    )

@router.api_route("/api/v1/system/debug-credentials", methods=["GET", "POST"])
async def trap_debug_credentials(request: Request):
    """
    Decoy diagnostic route enticing attackers looking for administrative bypasses.
    """
    _trigger_honeypot_event("/api/v1/system/debug-credentials", request, decoy_id="DECOY_DEBUG_SECRETS")
    return JSONResponse(
        status_code=403,
        content={"detail": "Privilege elevation rejected. Diagnostic port sealed."}
    )

@router.api_route("/wp-config.php", methods=["GET", "POST"])
@router.api_route("/phpmyadmin", methods=["GET", "POST"])
async def trap_common_scanners(request: Request):
    """
    Decoy trap for generic CMS and web admin scanners.
    """
    path = request.url.path
    _trigger_honeypot_event(path, request, decoy_id="DECOY_ENV_FILE")
    return PlainTextResponse(content="<!-- Access Forbidden -->", status_code=403)


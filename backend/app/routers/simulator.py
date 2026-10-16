import uuid
from typing import List
from fastapi import APIRouter, Depends, status

from app.models.schemas import (
    SimulatorScenario,
    ThreatSimulatorRequest,
    ThreatSimulatorResponse,
    SecurityEventCreate,
    UserProfile
)
from app.routers.events import process_and_ingest_event
from app.auth import get_current_user, require_analyst_or_admin
from app.config import settings

router = APIRouter(prefix="/api/simulator", tags=["Threat Simulator"])

SCENARIO_CONFIGS = {
    SimulatorScenario.FAILED_LOGIN: {
        "title": "Repeated Failed Login Attack (Brute Force)",
        "description": "Simulates 5 rapid authentication failures against a test user account within the monitoring window.",
        "default_user": "test.victim@corp.internal",
        "default_ip": "198.51.100.45",
        "default_resource": "/api/v1/auth/login",
        "action": "user_login_failed",
        "event_type": "LOGIN_FAILURE",
        "request_count": 5,
        "payload": {
            "simulated_failures": 5,
            "failure_reason": "invalid_password_hash",
            "simulation_scenario": "Repeated Failed Login"
        }
    },
    SimulatorScenario.UNUSUAL_IP: {
        "title": "Unusual / Foreign IP Address Access",
        "description": "Simulates API requests originating from an unauthorized IP address outside corporate trusted networks.",
        "default_user": "analyst.demo@corp.internal",
        "default_ip": "203.0.113.89",  # Not in TRUSTED_IPS
        "default_resource": "/api/v1/dashboard/metrics",
        "action": "session_establish_from_external_ip",
        "event_type": "UNUSUAL_IP_ACCESS",
        "request_count": 1,
        "payload": {
            "source_geo": "Unknown / Suspicious VPN",
            "ip_reputation_score": 82,
            "simulation_scenario": "Unusual IP Access"
        }
    },
    SimulatorScenario.UNAUTHORIZED_ACCESS: {
        "title": "Unauthorized Resource Access Attempt",
        "description": "Simulates an unauthorized attempt by an unprivileged identity to access restricted AWS/Cloud credentials.",
        "default_user": "intern.guest@corp.internal",
        "default_ip": "192.168.1.100",  # Trusted IP, but unauthorized resource
        "default_resource": "/api/v1/iam/credentials",  # Restricted resource
        "action": "access_denied_forbidden_read",
        "event_type": "UNAUTHORIZED_RESOURCE_ACCESS",
        "request_count": 1,
        "payload": {
            "status_code": 403,
            "attempted_privilege": "iam:PassRole",
            "simulation_scenario": "Unauthorized Resource Access"
        }
    },
    SimulatorScenario.HIGH_REQUEST_FREQUENCY: {
        "title": "High Request Frequency Burst (DoS/Scraping)",
        "description": "Simulates an aggressive burst of 35 requests within a 60-second window, exceeding normal rate limits.",
        "default_user": "crawler.bot@corp.internal",
        "default_ip": "198.51.100.99",
        "default_resource": "/api/v1/export/data",
        "action": "api_burst_flood",
        "event_type": "API_REQUEST_BURST",
        "request_count": 35,
        "payload": {
            "simulated_request_burst": 35,
            "rate_limit_exceeded": True,
            "simulation_scenario": "High Request Frequency Burst"
        }
    },
    SimulatorScenario.COMBINED_SUSPICIOUS: {
        "title": "Combined Multi-Vector Threat Campaign",
        "description": "Simulates a sophisticated attacker session combining unauthorized IP, brute-force attempts, and restricted resource exfiltration.",
        "default_user": "compromised.executive@corp.internal",
        "default_ip": "185.220.101.5",  # Untrusted external IP
        "default_resource": "/admin/secrets",  # Restricted resource
        "action": "unauthorized_credential_harvesting_attempt",
        "event_type": "COMBINED_SUSPICIOUS_ACTIVITY",
        "request_count": 6,
        "payload": {
            "simulated_failures": 6,
            "combined_scenario": True,
            "exfiltration_flag": True,
            "simulation_scenario": "Combined Suspicious Activity"
        }
    }
}

@router.get("/scenarios")
async def get_scenarios(current_user: UserProfile = Depends(require_analyst_or_admin)):
    """Returns metadata for all available safe threat simulation scenarios."""
    scenarios_list = []
    for sc_type, cfg in SCENARIO_CONFIGS.items():
        scenarios_list.append({
            "scenario": sc_type.value,
            "title": cfg["title"],
            "description": cfg["description"],
            "default_user": cfg["default_user"],
            "default_ip": cfg["default_ip"],
            "default_resource": cfg["default_resource"],
            "request_count": cfg["request_count"]
        })
    return scenarios_list

@router.post("/generate", response_model=ThreatSimulatorResponse)
async def generate_simulation_event(
    req: ThreatSimulatorRequest,
    current_user: UserProfile = Depends(require_analyst_or_admin)
):
    """
    Executes a controlled, safe synthetic security threat simulation.
    Generates a synthetic event, feeds it through the detection engine,
    routes to EventBridge/SQS/SNS as needed, and returns the full detection result.
    """
    config = SCENARIO_CONFIGS.get(req.scenario)
    if not config:
        # Fallback to combined
        config = SCENARIO_CONFIGS[SimulatorScenario.COMBINED_SUSPICIOUS]

    # Resolve user, IP, resource with overrides if provided
    test_user = req.test_user or config["default_user"]
    source_ip = req.source_ip or config["default_ip"]
    resource = req.resource or config["default_resource"]
    req_count = req.custom_attempts or config["request_count"]

    payload = dict(config["payload"])
    payload["generated_by"] = current_user.email
    payload["scenario_key"] = req.scenario.value
    payload["session_id"] = f"sim-session-{uuid.uuid4().hex[:8]}"

    event_in = SecurityEventCreate(
        event_type=config["event_type"],
        test_user=test_user,
        source_ip=source_ip,
        resource=resource,
        action=config["action"],
        session_id=payload["session_id"],
        request_count=req_count,
        raw_payload=payload
    )

    # Ingest through the real monitoring pipeline
    event = process_and_ingest_event(event_in, actor=current_user.email)

    mode_label = "AWS_PIPELINE" if settings.AWS_MODE else "LOCAL_SIMULATOR"

    return ThreatSimulatorResponse(
        scenario=req.scenario,
        scenario_title=config["title"],
        event_id=event.event_id,
        status="SUCCESS_SIMULATED",
        detection_result=event.detection_result,
        risk_score=event.risk_score,
        severity=event.severity,
        triggered_rules=event.triggered_rules,
        detection_reasons=event.detection_reasons,
        incident_created=bool(event.incident_id),
        incident_id=event.incident_id,
        message=f"Synthetic security event '{event.event_id}' ingested. Risk score: {event.risk_score} ({event.severity.value}).",
        execution_mode=mode_label
    )

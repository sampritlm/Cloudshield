import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.engine.detector import engine
from app.models.schemas import SecurityEventCreate, SeverityLevel
from app.engine.rules import RULE_HONEYPOT_TRIGGERED

client = TestClient(app)

@pytest.fixture
def admin_token():
    res = client.post("/api/auth/login", json={
        "email": "admin@cloudshield.internal",
        "password": "Admin@CloudShield2026!"
    })
    assert res.status_code == 200
    return res.json()["access_token"]

def test_honeypot_detection_engine_rule():
    event_in = SecurityEventCreate(
        event_type="HONEYPOT_TRIGGERED",
        test_user="scanner_bot_01",
        source_ip="198.51.100.88",
        resource="/api/v1/internal/aws-keys",
        action="honeypot_trap_accessed",
        raw_payload={"is_honeypot": True}
    )
    result = engine.evaluate_event(event_in)
    assert result.is_threat is True
    assert result.risk_score >= 80
    assert result.severity == SeverityLevel.CRITICAL
    rule_codes = [r.rule_code for r in result.rules_triggered]
    assert RULE_HONEYPOT_TRIGGERED in rule_codes
    assert any("Honeypot" in reason or "decoy" in reason.lower() for reason in result.reasons)

def test_honeypot_env_decoy_trap():
    res = client.get("/.env")
    assert res.status_code == 200
    assert "AKIA_CANARY_TRAP" in res.text

def test_honeypot_aws_keys_decoy_trap():
    res = client.get("/api/v1/internal/aws-keys")
    assert res.status_code == 403
    data = res.json()
    assert data.get("canary_token_tracked") is True

def test_canary_honeytoken_login():
    res = client.post("/api/auth/login", json={
        "email": "canary.admin@cloudshield.internal",
        "password": "AnyHackerPassword123!"
    })
    assert res.status_code == 401
    assert res.headers.get("X-Rule-Code") == "RULE_06_HONEYPOT_TRAP"
    assert res.headers.get("X-Severity") == "CRITICAL"
    assert res.headers.get("X-Rule-Triggered") == "true"

def test_autofill_bait_password_redirects_to_honeypot():
    res = client.post("/api/auth/login", json={
        "email": "admin@cloudshield.internal",
        "password": "Password123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "honeypot"
    assert data["user"]["email"] == "admin-trap@cloudshield.internal"

def test_real_admin_password_redirects_to_real_soc():
    res = client.post("/api/auth/login", json={
        "email": "admin@cloudshield.internal",
        "password": "Admin@CloudShield2026!"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "admin"

def test_honeypot_status_api(admin_token):
    res = client.get("/api/honeypot/status", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["enabled"] is True
    assert data["total_traps_active"] >= 5
    assert len(data["decoys"]) >= 5

def test_threat_simulator_honeypot_scenario(admin_token):
    res = client.post("/api/simulator/generate", json={
        "scenario": "HONEYPOT_TRIGGERED",
        "resource": "/api/v1/internal/aws-keys"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["scenario"] == "HONEYPOT_TRIGGERED"
    assert data["severity"] == "CRITICAL"
    assert data["risk_score"] >= 80
    assert RULE_HONEYPOT_TRIGGERED in data["triggered_rules"]
    assert data["incident_created"] is True


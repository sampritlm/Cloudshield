import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.engine.detector import ThreatDetectionEngine
from app.models.schemas import SecurityEventCreate, SourcePlatform
from app.engine.rules import (
    CANIPHISH_EMAIL_TEMPLATES,
    CANIPHISH_PHISHING_WEBSITES,
    RULE_CANIPHISH_EMAIL_OPENED,
    RULE_CANIPHISH_PAYLOAD_CLICKED,
    RULE_CANIPHISH_WEBSITE_VISITED,
    RULE_CANIPHISH_EMPLOYEE_COMPROMISED,
    RULE_CANIPHISH_EMAIL_REPORTED,
)

client = TestClient(app)

@pytest.fixture
def admin_token():
    res = client.post("/api/auth/login", json={
        "email": "admin@cloudshield.internal",
        "password": "Admin@CloudShield2026!"
    })
    assert res.status_code == 200
    return res.json()["access_token"]


def test_caniphish_catalogs_exist():
    """Verify all 5 email templates and 3 phishing websites exist with required specifications."""
    expected_templates = [
        "Gmail-Blocked-Login",
        "OneDrive-Word-Share",
        "Microsoft-Security-Alert",
        "HR-Device-Violation",
        "Linkedin-Password-Reset",
    ]
    for tmpl in expected_templates:
        assert tmpl in CANIPHISH_EMAIL_TEMPLATES
        item = CANIPHISH_EMAIL_TEMPLATES[tmpl]
        assert "difficulty" in item
        assert "compromise_rate" in item
        assert "paired_website" in item

    expected_websites = ["Google-Login", "Microsoft-Login", "LinkedIn-Login"]
    for site in expected_websites:
        assert site in CANIPHISH_PHISHING_WEBSITES
        item = CANIPHISH_PHISHING_WEBSITES[site]
        assert item["domain"] == "alerting-services.com"
        assert "landing_url" in item


def test_engine_email_opened_detection():
    """Verify opening an email threat evaluates to Low severity (15 pts)."""
    engine = ThreatDetectionEngine()
    event = SecurityEventCreate(
        event_type="emailOpened",
        test_user="employee@corp.com",
        source_ip="185.220.101.5",
        resource="https://alerting-services.com",
        action="opened_email",
        source_platform=SourcePlatform.CANIPHISH,
        raw_payload={
            "template_code": "Gmail-Blocked-Login",
            "emailOpened": True
        }
    )
    result = engine.evaluate_event(event)
    assert result.risk_score == 15
    assert result.severity.value == "LOW"
    assert any(r.rule_code == RULE_CANIPHISH_EMAIL_OPENED for r in result.rules_triggered)


def test_engine_link_clicked_detection():
    """Verify clicking an email lure link evaluates to payload clicked (30 pts)."""
    engine = ThreatDetectionEngine()
    event = SecurityEventCreate(
        event_type="payloadClicked",
        test_user="employee@corp.com",
        source_ip="185.220.101.5",
        resource="https://accounts.google.alerting-services.com",
        action="clicked_phishing_link",
        source_platform=SourcePlatform.CANIPHISH,
        raw_payload={
            "template_code": "Gmail-Blocked-Login",
            "phishing_website": "Google-Login",
            "payloadInteraction": True
        }
    )
    result = engine.evaluate_event(event)
    assert result.risk_score >= 30
    assert any(r.rule_code == RULE_CANIPHISH_PAYLOAD_CLICKED for r in result.rules_triggered)


def test_engine_credential_compromise_on_phishing_website():
    """Verify entering credentials on alerting-services.com triggers Critical severity (100 pts)."""
    engine = ThreatDetectionEngine()
    event = SecurityEventCreate(
        event_type="employeeCompromised",
        test_user="victim@corp.com",
        source_ip="185.220.101.5",
        resource="https://login.microsoftonline.alerting-services.com",
        action="submitted_credentials",
        source_platform=SourcePlatform.CANIPHISH,
        raw_payload={
            "template_code": "HR-Device-Violation",
            "phishing_website": "Microsoft-Login",
            "employeeCompromised": True,
            "harvested_fields": ["email", "password"]
        }
    )
    result = engine.evaluate_event(event)
    assert result.risk_score == 100
    assert result.severity.value == "CRITICAL"
    assert result.is_threat is True
    assert any(r.rule_code == RULE_CANIPHISH_EMPLOYEE_COMPROMISED for r in result.rules_triggered)


def test_engine_email_reported_positive_defense():
    """Verify reporting an email threat produces 0 risk score and logs positive defense."""
    engine = ThreatDetectionEngine()
    event = SecurityEventCreate(
        event_type="emailReported",
        test_user="vigilant@corp.com",
        source_ip="185.220.101.5",
        resource="https://alerting-services.com",
        action="reported_phish",
        source_platform=SourcePlatform.CANIPHISH,
        raw_payload={
            "template_code": "Linkedin-Password-Reset",
            "emailReported": True
        }
    )
    result = engine.evaluate_event(event)
    assert result.risk_score == 0
    assert result.severity.value == "LOW"
    assert any(r.rule_code == RULE_CANIPHISH_EMAIL_REPORTED for r in result.rules_triggered)


def test_catalog_endpoint(admin_token):
    """GET /api/caniphish/catalog returns all 5 templates and 3 phishing websites."""
    res = client.get("/api/caniphish/catalog", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert len(data["email_templates"]) == 5
    assert len(data["phishing_websites"]) == 3
    assert data["domain"] == "alerting-services.com"


def test_simulate_attack_all_actions(admin_token):
    """POST /api/caniphish/simulate-attack tests visit, harvest, and report actions."""
    # 1. Visit action
    res_visit = client.post(
        "/api/caniphish/simulate-attack",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "target_user": "test.user@cloudshield.internal",
            "template_code": "OneDrive-Word-Share",
            "phishing_website": "Microsoft-Login",
            "action": "visit"
        }
    )
    assert res_visit.status_code == 200
    assert res_visit.json()["risk_score"] >= 30

    # 2. Harvest credentials action (Critical threat)
    res_harvest = client.post(
        "/api/caniphish/simulate-attack",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "target_user": "test.user@cloudshield.internal",
            "template_code": "Microsoft-Security-Alert",
            "phishing_website": "Microsoft-Login",
            "action": "harvest"
        }
    )
    assert res_harvest.status_code == 200
    assert res_harvest.json()["risk_score"] == 100
    assert res_harvest.json()["severity"] == "CRITICAL"
    assert res_harvest.json()["incident_id"] is not None

    # 3. Report action (Positive defense)
    res_report = client.post(
        "/api/caniphish/simulate-attack",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "target_user": "test.user@cloudshield.internal",
            "template_code": "Linkedin-Password-Reset",
            "phishing_website": "LinkedIn-Login",
            "action": "report"
        }
    )
    assert res_report.status_code == 200
    assert res_report.json()["risk_score"] == 0

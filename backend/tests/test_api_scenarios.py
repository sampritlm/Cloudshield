import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def admin_token():
    res = client.post("/api/auth/login", json={
        "email": "admin@cloudshield.internal",
        "password": "Admin@CloudShield2026!"
    })
    assert res.status_code == 200
    return res.json()["access_token"]

@pytest.fixture
def user_token():
    res = client.post("/api/auth/login", json={
        "email": "user@cloudshield.internal",
        "password": "User@CloudShield2026!"
    })
    assert res.status_code == 200
    return res.json()["access_token"]

def test_login_invalid_credentials():
    res = client.post("/api/auth/login", json={
        "email": "admin@cloudshield.internal",
        "password": "WrongPassword123!"
    })
    assert res.status_code == 401
    assert "Invalid credentials" in res.json()["detail"]

def test_dashboard_summary(admin_token):
    res = client.get("/api/dashboard/summary", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "total_events" in data
    assert "detected_threats" in data
    assert "aws_mode" in data

def test_threat_simulator_scenarios(admin_token):
    # Test Scenario 1: Repeated Failed Login
    res = client.post("/api/simulator/generate", json={
        "scenario": "FAILED_LOGIN"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS_SIMULATED"
    assert "RULE_01_FAILED_LOGIN" in data["triggered_rules"]
    assert data["risk_score"] > 30

    # Test Scenario 2: Unusual IP
    res = client.post("/api/simulator/generate", json={
        "scenario": "UNUSUAL_IP"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "RULE_02_UNUSUAL_IP" in data["triggered_rules"]

    # Test Scenario 3: Unauthorized Access
    res = client.post("/api/simulator/generate", json={
        "scenario": "UNAUTHORIZED_ACCESS"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "RULE_03_UNAUTHORIZED_RESOURCE" in data["triggered_rules"]

    # Test Scenario 4: High Request Frequency
    res = client.post("/api/simulator/generate", json={
        "scenario": "HIGH_REQUEST_FREQUENCY"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "RULE_04_REQUEST_BURST" in data["triggered_rules"]

    # Test Scenario 5: Combined Suspicious
    res = client.post("/api/simulator/generate", json={
        "scenario": "COMBINED_SUSPICIOUS"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "RULE_05_COMBINED_SUSPICIOUS" in data["triggered_rules"]
    assert data["severity"] == "CRITICAL"

def test_rbac_incident_status_update(admin_token, user_token):
    # First get an incident
    res = client.get("/api/incidents", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    incidents = res.json()["items"]
    assert len(incidents) > 0
    test_incident_id = incidents[0]["incident_id"]

    # Normal user should be rejected (403 Forbidden)
    res_user = client.patch(
        f"/api/incidents/{test_incident_id}/status",
        json={"status": "INVESTIGATING", "note": "Unauthorized user attempt"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert res_user.status_code == 403

    # Admin should succeed (200 OK)
    res_admin = client.patch(
        f"/api/incidents/{test_incident_id}/status",
        json={"status": "INVESTIGATING", "note": "Admin triage in progress"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_admin.status_code == 200
    assert res_admin.json()["status"] == "INVESTIGATING"

def test_invalid_event_input_validation(admin_token):
    """Submitting missing mandatory fields yields 422 Unprocessable Entity."""
    res = client.post("/api/events", json={
        "test_user": "only_user_provided"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 422

def test_rbac_permissions_matrix(admin_token, user_token):
    """
    Enforces the explicit CloudShield Role-Based Access Control matrix:
    Action                              | Admin | Normal User
    View all authorized security events | Yes   | No (403)
    View personal simulation results    | Yes   | Yes (200)
    Investigate and resolve incidents   | Yes   | No (403)
    View integration and AWS health     | Yes   | No (403)
    Manage user accounts and roles      | Yes   | No (403)
    View personal awareness tips        | Yes   | Yes (200)
    View organization-wide reports      | Yes   | No (403)
    Edit personal profile               | Yes   | Yes (200)
    """
    admin_hdr = {"Authorization": f"Bearer {admin_token}"}
    user_hdr = {"Authorization": f"Bearer {user_token}"}

    # 1. View all authorized security events
    assert client.get("/api/events", headers=admin_hdr).status_code == 200
    assert client.get("/api/events", headers=user_hdr).status_code == 403

    # 2. View personal simulation results
    assert client.get("/api/user/portal/simulations", headers=admin_hdr).status_code == 200
    assert client.get("/api/user/portal/simulations", headers=user_hdr).status_code == 200

    # 3. Investigate and resolve incidents
    assert client.get("/api/incidents", headers=admin_hdr).status_code == 200
    assert client.get("/api/incidents", headers=user_hdr).status_code == 403

    # 4. View integration and AWS health
    assert client.get("/api/system/health", headers=admin_hdr).status_code == 200
    assert client.get("/api/system/health", headers=user_hdr).status_code == 403
    assert client.get("/api/caniphish/status", headers=admin_hdr).status_code == 200
    assert client.get("/api/caniphish/status", headers=user_hdr).status_code == 403

    # 5. Manage user accounts and roles
    assert client.get("/api/users", headers=admin_hdr).status_code == 200
    assert client.get("/api/users", headers=user_hdr).status_code == 403

    # 6. View personal awareness tips
    assert client.get("/api/user/portal/learning", headers=admin_hdr).status_code == 200
    assert client.get("/api/user/portal/learning", headers=user_hdr).status_code == 200

    # 7. View organization-wide reports
    assert client.get("/api/reports/cloudtrail", headers=admin_hdr).status_code == 200
    assert client.get("/api/reports/cloudtrail", headers=user_hdr).status_code == 403

    # 8. Edit personal profile preferences
    assert client.patch("/api/user/portal/preferences", json={"email_alerts": True}, headers=admin_hdr).status_code == 200
    assert client.patch("/api/user/portal/preferences", json={"email_alerts": True}, headers=user_hdr).status_code == 200

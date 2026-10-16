import pytest
from datetime import datetime, timezone
from app.config import Settings
from app.engine.detector import ThreatDetectionEngine, classify_severity
from app.engine.rules import (
    RULE_REPEATED_FAILED_LOGIN,
    RULE_UNUSUAL_IP,
    RULE_UNAUTHORIZED_ACCESS,
    RULE_HIGH_REQUEST_FREQUENCY,
    RULE_COMBINED_ACTIVITY
)
from app.models.schemas import SecurityEventCreate, SeverityLevel

@pytest.fixture
def test_engine():
    custom_cfg = Settings(
        FAILED_LOGIN_THRESHOLD=5,
        FAILED_LOGIN_WINDOW_SECONDS=300,
        HIGH_REQUEST_FREQ_THRESHOLD=20,
        HIGH_REQUEST_FREQ_WINDOW_SECONDS=60,
        TRUSTED_IPS=["127.0.0.1", "192.168.1.100"],
        RESTRICTED_RESOURCES=["/admin/secrets", "/api/v1/iam/credentials"],
        POINTS_FAILED_LOGIN=40,
        POINTS_UNUSUAL_IP=25,
        POINTS_UNAUTHORIZED_ACCESS=45,
        POINTS_HIGH_REQUEST_FREQ=35,
        POINTS_COMBINED_BONUS=20,
        AWS_MODE=False
    )
    return ThreatDetectionEngine(custom_settings=custom_cfg)

def test_severity_classification_boundaries():
    """Verify strict adherence to 0-30 Low, 31-60 Medium, 61-80 High, 81-100 Critical."""
    assert classify_severity(0) == SeverityLevel.LOW
    assert classify_severity(30) == SeverityLevel.LOW
    assert classify_severity(31) == SeverityLevel.MEDIUM
    assert classify_severity(60) == SeverityLevel.MEDIUM
    assert classify_severity(61) == SeverityLevel.HIGH
    assert classify_severity(80) == SeverityLevel.HIGH
    assert classify_severity(81) == SeverityLevel.CRITICAL
    assert classify_severity(100) == SeverityLevel.CRITICAL

def test_clean_normal_activity(test_engine):
    """Normal access from trusted IP should produce 0 risk and LOW severity."""
    event = SecurityEventCreate(
        event_type="NORMAL_ACCESS",
        test_user="john.doe@corp.internal",
        source_ip="192.168.1.100",  # Trusted
        resource="/api/v1/profile",
        action="view_profile"
    )
    result = test_engine.evaluate_event(event)
    assert result.is_threat is False
    assert result.risk_score == 0
    assert result.severity == SeverityLevel.LOW
    assert len(result.rules_triggered) == 0

def test_scenario_1_repeated_failed_login(test_engine):
    """5 failed logins for same user triggers RULE_01_FAILED_LOGIN (40 pts)."""
    event = SecurityEventCreate(
        event_type="LOGIN_FAILURE",
        test_user="target.victim@corp.internal",
        source_ip="192.168.1.100",  # Trusted IP
        resource="/api/v1/auth/login",
        action="user_login_failed",
        request_count=5,
        raw_payload={"simulated_failures": 5}
    )
    result = test_engine.evaluate_event(event)
    assert result.is_threat is True
    assert result.risk_score == 40
    assert result.severity == SeverityLevel.MEDIUM
    rule_codes = [r.rule_code for r in result.rules_triggered]
    assert RULE_REPEATED_FAILED_LOGIN in rule_codes
    assert RULE_UNUSUAL_IP not in rule_codes

def test_scenario_2_unusual_ip(test_engine):
    """Untrusted source IP triggers RULE_02_UNUSUAL_IP (25 pts)."""
    event = SecurityEventCreate(
        event_type="NORMAL_ACCESS",
        test_user="remote.worker@corp.internal",
        source_ip="203.0.113.88",  # Untrusted
        resource="/api/v1/dashboard",
        action="read_dashboard"
    )
    result = test_engine.evaluate_event(event)
    assert result.is_threat is True
    assert result.risk_score == 25
    assert result.severity == SeverityLevel.LOW
    rule_codes = [r.rule_code for r in result.rules_triggered]
    assert RULE_UNUSUAL_IP in rule_codes

def test_scenario_3_unauthorized_resource_access(test_engine):
    """Accessing restricted resource triggers RULE_03_UNAUTHORIZED_RESOURCE (45 pts)."""
    event = SecurityEventCreate(
        event_type="UNAUTHORIZED_RESOURCE_ACCESS",
        test_user="intern.dev@corp.internal",
        source_ip="192.168.1.100",  # Trusted
        resource="/api/v1/iam/credentials",  # Restricted
        action="access_denied_forbidden_read"
    )
    result = test_engine.evaluate_event(event)
    assert result.is_threat is True
    assert result.risk_score == 45
    assert result.severity == SeverityLevel.MEDIUM
    rule_codes = [r.rule_code for r in result.rules_triggered]
    assert RULE_UNAUTHORIZED_ACCESS in rule_codes

def test_scenario_4_high_request_frequency(test_engine):
    """Exceeding 20 requests in window triggers RULE_04_REQUEST_BURST (35 pts)."""
    event = SecurityEventCreate(
        event_type="API_REQUEST_BURST",
        test_user="crawler@unknown.com",
        source_ip="192.168.1.100",  # Trusted
        resource="/api/v1/catalog",
        action="api_burst_flood",
        request_count=25,
        raw_payload={"simulated_request_burst": 25}
    )
    result = test_engine.evaluate_event(event)
    assert result.is_threat is True
    assert result.risk_score == 35
    assert result.severity == SeverityLevel.MEDIUM
    rule_codes = [r.rule_code for r in result.rules_triggered]
    assert RULE_HIGH_REQUEST_FREQUENCY in rule_codes

def test_scenario_5_combined_suspicious_activity_and_capping(test_engine):
    """
    Multiple suspicious signals (Unusual IP + Failed Login + Unauthorized Access)
    triggers Combined Bonus (+20 pts) and caps at 100 max.
    40 + 25 + 45 + 20 = 130 -> capped to 100.
    """
    event = SecurityEventCreate(
        event_type="COMBINED_SUSPICIOUS_ACTIVITY",
        test_user="attacker@malicious.org",
        source_ip="198.51.100.50",  # Untrusted (+25)
        resource="/admin/secrets",  # Restricted (+45)
        action="unauthorized_read",
        request_count=5,
        raw_payload={"simulated_failures": 5, "combined_scenario": True}  # (+40)
    )
    result = test_engine.evaluate_event(event)
    assert result.is_threat is True
    assert result.risk_score == 100  # Capped at 100
    assert result.severity == SeverityLevel.CRITICAL
    rule_codes = [r.rule_code for r in result.rules_triggered]
    assert RULE_REPEATED_FAILED_LOGIN in rule_codes
    assert RULE_UNUSUAL_IP in rule_codes
    assert RULE_UNAUTHORIZED_ACCESS in rule_codes
    assert RULE_COMBINED_ACTIVITY in rule_codes

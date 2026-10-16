import uuid
from datetime import datetime, timezone, timedelta
from app.models.schemas import (
    SecurityEvent,
    Incident,
    SeverityLevel,
    IncidentStatus,
    StatusUpdateEntry,
    SourcePlatform
)
from app.storage import get_storage

def seed_demo_data(force: bool = False):
    """
    Seeds initial synthetic security events and incidents for realistic local demonstration.
    Only seeds if the database is currently empty (unless force is True).
    """
    storage = get_storage()
    events, total = storage.list_events(limit=5)
    if total > 0 and not force:
        return

    now = datetime.now(timezone.utc)

    # 1. Clean / Normal Activity
    evt1_id = "evt-seed-normal-01"
    t1 = (now - timedelta(hours=6)).isoformat()
    e1 = SecurityEvent(
        event_id=evt1_id,
        timestamp=t1,
        event_type="NORMAL_ACCESS",
        test_user="engineer.alex@cloudshield.internal",
        source_ip="192.168.1.100",  # Trusted IP
        resource="/api/v1/dashboard/metrics",
        action="user_dashboard_view",
        session_id="sess-seed-01",
        request_count=1,
        raw_payload={"method": "GET", "status_code": 200},
        processed=True,
        detection_result="NORMAL_CLEAN",
        risk_score=0,
        severity=SeverityLevel.LOW,
        triggered_rules=[],
        detection_reasons=["Normal standard activity within acceptable operational baseline."],
        processed_by="LOCAL_SIMULATOR",
        incident_id=None
    )
    storage.save_event(e1)

    # 2. Repeated Failed Login Scenario
    evt2_id = "evt-seed-failed-login-02"
    inc2_id = "inc-seed-failed-login-02"
    t2 = (now - timedelta(hours=4, minutes=30)).isoformat()
    e2 = SecurityEvent(
        event_id=evt2_id,
        timestamp=t2,
        event_type="LOGIN_FAILURE",
        test_user="test.target@corp.internal",
        source_ip="198.51.100.45",
        resource="/api/v1/auth/login",
        action="user_login_failed",
        session_id="sess-seed-02",
        request_count=5,
        raw_payload={"simulated_failures": 5, "reason": "invalid_password"},
        processed=True,
        detection_result="SUSPICIOUS_THREAT",
        risk_score=65,  # 40 (failed login) + 25 (untrusted IP)
        severity=SeverityLevel.HIGH,
        triggered_rules=["RULE_01_FAILED_LOGIN", "RULE_02_UNUSUAL_IP"],
        detection_reasons=[
            "Repeated failed login: 5 failed attempts detected for test user 'test.target@corp.internal'.",
            "Unusual IP address: Source IP '198.51.100.45' is not present in trusted IP whitelist."
        ],
        processed_by="LOCAL_SIMULATOR",
        incident_id=inc2_id
    )
    storage.save_event(e2)

    inc2 = Incident(
        incident_id=inc2_id,
        event_id=evt2_id,
        threat_type="Repeated Failed Authentication",
        severity=SeverityLevel.HIGH,
        risk_score=65,
        test_user="test.target@corp.internal",
        source_ip="198.51.100.45",
        resource="/api/v1/auth/login",
        detected_at=t2,
        reasons=e2.detection_reasons,
        triggered_rules=e2.triggered_rules,
        status=IncidentStatus.OPEN,
        status_history=[
            StatusUpdateEntry(
                from_status=IncidentStatus.OPEN,
                to_status=IncidentStatus.OPEN,
                updated_at=t2,
                updated_by="ThreatDetectionEngine (LOCAL_SIMULATOR)",
                note="Brute-force credential stuffing attack detected."
            )
        ],
        processed_by="LOCAL_SIMULATOR",
        notified_via_sns=True,
        sqs_message_id="sim-sqs-002",
        last_updated_at=t2
    )
    storage.save_incident(inc2)

    # 3. Unusual IP Access Scenario
    evt3_id = "evt-seed-unusual-ip-03"
    t3 = (now - timedelta(hours=3, minutes=15)).isoformat()
    e3 = SecurityEvent(
        event_id=evt3_id,
        timestamp=t3,
        event_type="UNUSUAL_IP_ACCESS",
        test_user="sarah.analyst@cloudshield.internal",
        source_ip="203.0.113.89",  # Untrusted external IP
        resource="/api/v1/system/status",
        action="api_request_external_geo",
        session_id="sess-seed-03",
        request_count=1,
        raw_payload={"geo": "Tor Exit Node / Anonymous Proxy"},
        processed=True,
        detection_result="SUSPICIOUS_THREAT",
        risk_score=25,
        severity=SeverityLevel.LOW,
        triggered_rules=["RULE_02_UNUSUAL_IP"],
        detection_reasons=["Unusual IP address: Source IP '203.0.113.89' is not present in trusted IP whitelist."],
        processed_by="LOCAL_SIMULATOR",
        incident_id=None
    )
    storage.save_event(e3)

    # 4. Unauthorized Resource Access Scenario
    evt4_id = "evt-seed-unauth-access-04"
    inc4_id = "inc-seed-unauth-access-04"
    t4 = (now - timedelta(hours=2)).isoformat()
    e4 = SecurityEvent(
        event_id=evt4_id,
        timestamp=t4,
        event_type="UNAUTHORIZED_RESOURCE_ACCESS",
        test_user="contractor.temp@corp.internal",
        source_ip="192.168.1.100",
        resource="/api/v1/iam/credentials",
        action="access_denied_forbidden_read",
        session_id="sess-seed-04",
        request_count=1,
        raw_payload={"status_code": 403, "endpoint": "/api/v1/iam/credentials"},
        processed=True,
        detection_result="SUSPICIOUS_THREAT",
        risk_score=45,
        severity=SeverityLevel.MEDIUM,
        triggered_rules=["RULE_03_UNAUTHORIZED_RESOURCE"],
        detection_reasons=["Unauthorized resource access: Target '/api/v1/iam/credentials' is a restricted cloud asset."],
        processed_by="LOCAL_SIMULATOR",
        incident_id=inc4_id
    )
    storage.save_event(e4)

    inc4 = Incident(
        incident_id=inc4_id,
        event_id=evt4_id,
        threat_type="Unauthorized Resource Access Attempt",
        severity=SeverityLevel.MEDIUM,
        risk_score=45,
        test_user="contractor.temp@corp.internal",
        source_ip="192.168.1.100",
        resource="/api/v1/iam/credentials",
        detected_at=t4,
        reasons=e4.detection_reasons,
        triggered_rules=e4.triggered_rules,
        status=IncidentStatus.INVESTIGATING,
        status_history=[
            StatusUpdateEntry(
                from_status=IncidentStatus.OPEN,
                to_status=IncidentStatus.OPEN,
                updated_at=t4,
                updated_by="ThreatDetectionEngine (LOCAL_SIMULATOR)",
                note="Detected unauthorized IAM credential access attempt."
            ),
            StatusUpdateEntry(
                from_status=IncidentStatus.OPEN,
                to_status=IncidentStatus.INVESTIGATING,
                updated_at=(now - timedelta(hours=1, minutes=45)).isoformat(),
                updated_by="Alex Vance (admin@cloudshield.internal)",
                note="Contacting contractor manager to verify need for IAM role."
            )
        ],
        processed_by="LOCAL_SIMULATOR",
        notified_via_sns=False,
        sqs_message_id=None,
        last_updated_at=(now - timedelta(hours=1, minutes=45)).isoformat()
    )
    storage.save_incident(inc4)

    # 5. High Request Frequency Scenario
    evt5_id = "evt-seed-burst-freq-05"
    inc5_id = "inc-seed-burst-freq-05"
    t5 = (now - timedelta(hours=1, minutes=15)).isoformat()
    e5 = SecurityEvent(
        event_id=evt5_id,
        timestamp=t5,
        event_type="API_REQUEST_BURST",
        test_user="crawler.test@external.com",
        source_ip="198.51.100.99",
        resource="/api/v1/export/data",
        action="api_burst_flood",
        session_id="sess-seed-05",
        request_count=35,
        raw_payload={"simulated_request_burst": 35},
        processed=True,
        detection_result="SUSPICIOUS_THREAT",
        risk_score=60,  # 35 (burst) + 25 (untrusted IP)
        severity=SeverityLevel.MEDIUM,
        triggered_rules=["RULE_04_REQUEST_BURST", "RULE_02_UNUSUAL_IP"],
        detection_reasons=[
            "High request frequency: Burst rate reached 35 requests in 60s window.",
            "Unusual IP address: Source IP '198.51.100.99' is not present in trusted IP whitelist."
        ],
        processed_by="LOCAL_SIMULATOR",
        incident_id=inc5_id
    )
    storage.save_event(e5)

    inc5 = Incident(
        incident_id=inc5_id,
        event_id=evt5_id,
        threat_type="Abnormal High Request Frequency Burst",
        severity=SeverityLevel.MEDIUM,
        risk_score=60,
        test_user="crawler.test@external.com",
        source_ip="198.51.100.99",
        resource="/api/v1/export/data",
        detected_at=t5,
        reasons=e5.detection_reasons,
        triggered_rules=e5.triggered_rules,
        status=IncidentStatus.RESOLVED,
        status_history=[
            StatusUpdateEntry(
                from_status=IncidentStatus.OPEN,
                to_status=IncidentStatus.OPEN,
                updated_at=t5,
                updated_by="ThreatDetectionEngine (LOCAL_SIMULATOR)",
                note="High frequency request surge detected."
            ),
            StatusUpdateEntry(
                from_status=IncidentStatus.OPEN,
                to_status=IncidentStatus.RESOLVED,
                updated_at=(now - timedelta(minutes=30)).isoformat(),
                updated_by="Alex Vance (admin@cloudshield.internal)",
                note="Rate limiter engaged. Traffic normalized."
            )
        ],
        processed_by="LOCAL_SIMULATOR",
        notified_via_sns=False,
        sqs_message_id=None,
        last_updated_at=(now - timedelta(minutes=30)).isoformat()
    )
    storage.save_incident(inc5)

    # 6. Combined Multi-Vector Threat (Critical Severity)
    evt6_id = "evt-seed-combined-threat-06"
    inc6_id = "inc-seed-combined-threat-06"
    t6 = (now - timedelta(minutes=25)).isoformat()
    e6 = SecurityEvent(
        event_id=evt6_id,
        timestamp=t6,
        event_type="COMBINED_SUSPICIOUS_ACTIVITY",
        test_user="compromised.user@corp.internal",
        source_ip="185.220.101.5",
        resource="/admin/secrets",
        action="unauthorized_credential_harvesting_attempt",
        session_id="sess-seed-06",
        request_count=6,
        raw_payload={"simulated_failures": 6, "combined_scenario": True},
        processed=True,
        detection_result="SUSPICIOUS_THREAT",
        # 40 (failed login) + 25 (untrusted IP) + 45 (unauth access) + 20 (combined bonus) = 130 -> capped at 100!
        risk_score=100,
        severity=SeverityLevel.CRITICAL,
        triggered_rules=[
            "RULE_01_FAILED_LOGIN",
            "RULE_02_UNUSUAL_IP",
            "RULE_03_UNAUTHORIZED_RESOURCE",
            "RULE_05_COMBINED_SUSPICIOUS"
        ],
        detection_reasons=[
            "Repeated failed login: 6 failed attempts detected for test user 'compromised.user@corp.internal'.",
            "Unusual IP address: Source IP '185.220.101.5' is not present in trusted IP whitelist.",
            "Unauthorized resource access: Target '/admin/secrets' is a restricted cloud asset.",
            "Combined suspicious activity: Multi-vector correlation triggered bonus risk escalation (+20 pts)."
        ],
        processed_by="LOCAL_SIMULATOR",
        incident_id=inc6_id
    )
    storage.save_event(e6)

    inc6 = Incident(
        incident_id=inc6_id,
        event_id=evt6_id,
        threat_type="Correlated Multi-Vector Threat",
        severity=SeverityLevel.CRITICAL,
        risk_score=100,
        test_user="compromised.user@corp.internal",
        source_ip="185.220.101.5",
        resource="/admin/secrets",
        detected_at=t6,
        reasons=e6.detection_reasons,
        triggered_rules=e6.triggered_rules,
        status=IncidentStatus.OPEN,
        status_history=[
            StatusUpdateEntry(
                from_status=IncidentStatus.OPEN,
                to_status=IncidentStatus.OPEN,
                updated_at=t6,
                updated_by="ThreatDetectionEngine (LOCAL_SIMULATOR)",
                note="CRITICAL THREAT: Correlated attack detected on root secrets."
            )
        ],
        processed_by="LOCAL_SIMULATOR",
        notified_via_sns=True,
        sqs_message_id="sim-sqs-006",
        last_updated_at=t6
    )
    storage.save_incident(inc6)

    # 7. Normal User Phishing Simulation: Reported Phish (Positive Awareness)
    evt7_id = "evt-seed-caniphish-reported-07"
    t7 = (now - timedelta(days=2)).isoformat()
    e7 = SecurityEvent(
        event_id=evt7_id,
        timestamp=t7,
        event_type="emailReported",
        test_user="user@cloudshield.internal",
        source_ip="192.168.1.100",
        resource="caniphish://campaign/camp-payroll-2026",
        action="simulated_phishing_email_reported",
        session_id="sess-sim-07",
        request_count=1,
        source_platform=SourcePlatform.CANIPHISH,
        source_event_id="cp-ev-001",
        campaign_id="camp-payroll-2026",
        campaign_name="Executive Wire Transfer & Urgent Payroll Audit",
        raw_payload={"email_subject": "Urgent: Direct Deposit Discrepancy", "reported_via": "CloudShield Outlook Plugin"},
        processed=True,
        detection_result="NORMAL_CLEAN",
        risk_score=0,
        severity=SeverityLevel.LOW,
        triggered_rules=[],
        detection_reasons=["Positive action: User correctly recognized urgent payroll phishing simulation and reported to SOC."],
        processed_by="CANIPHISH_SIMULATOR",
        incident_id=None
    )
    storage.save_event(e7)

    # 8. Normal User Phishing Simulation: Delivered (No risky action)
    evt8_id = "evt-seed-caniphish-delivered-08"
    t8 = (now - timedelta(days=6)).isoformat()
    e8 = SecurityEvent(
        event_id=evt8_id,
        timestamp=t8,
        event_type="emailDelivered",
        test_user="user@cloudshield.internal",
        source_ip="192.168.1.100",
        resource="caniphish://campaign/camp-vpn-upgrade",
        action="simulated_email_delivered",
        session_id="sess-sim-08",
        request_count=1,
        source_platform=SourcePlatform.CANIPHISH,
        source_event_id="cp-ev-002",
        campaign_id="camp-vpn-upgrade",
        campaign_name="IT Helpdesk Mandatory VPN Certificate Upgrade",
        raw_payload={"email_subject": "Action Required: Update SSL VPN Certificate", "delivered": True},
        processed=True,
        detection_result="NORMAL_CLEAN",
        risk_score=0,
        severity=SeverityLevel.LOW,
        triggered_rules=[],
        detection_reasons=["Simulation delivered: User took no risky interaction; vigilance maintained."],
        processed_by="CANIPHISH_SIMULATOR",
        incident_id=None
    )
    storage.save_event(e8)

    # 9. Normal User Phishing Simulation: Payload Clicked (Training Recommended)
    evt9_id = "evt-seed-caniphish-clicked-09"
    t9 = (now - timedelta(days=12)).isoformat()
    e9 = SecurityEvent(
        event_id=evt9_id,
        timestamp=t9,
        event_type="payloadClicked",
        test_user="user@cloudshield.internal",
        source_ip="198.51.100.22",
        resource="caniphish://campaign/camp-m365-share",
        action="simulated_payload_clicked",
        session_id="sess-sim-09",
        request_count=1,
        source_platform=SourcePlatform.CANIPHISH,
        source_event_id="cp-ev-003",
        campaign_id="camp-m365-share",
        campaign_name="Microsoft 365 Cloud Document Verification",
        raw_payload={"email_subject": "Security Team shared 'Q1_Financial_Plan.xlsx'", "clicked_link": "https://m365-auth-login.xyz/verify"},
        processed=True,
        detection_result="SUSPICIOUS_THREAT",
        risk_score=30,
        severity=SeverityLevel.LOW,
        triggered_rules=["RULE_CANIPHISH_PAYLOAD_CLICKED"],
        detection_reasons=["Simulation interaction: User clicked simulated phishing hyperlink. Refresher lesson recommended."],
        processed_by="CANIPHISH_SIMULATOR",
        incident_id=None
    )
    storage.save_event(e9)

    # 10. Normal User Phishing Simulation: Delivered (HR Benefits Open Enrollment)
    evt10_id = "evt-seed-caniphish-delivered-10"
    t10 = (now - timedelta(days=19)).isoformat()
    e10 = SecurityEvent(
        event_id=evt10_id,
        timestamp=t10,
        event_type="emailDelivered",
        test_user="user@cloudshield.internal",
        source_ip="192.168.1.100",
        resource="caniphish://campaign/camp-hr-benefits",
        action="simulated_email_delivered",
        session_id="sess-sim-10",
        request_count=1,
        source_platform=SourcePlatform.CANIPHISH,
        source_event_id="cp-ev-004",
        campaign_id="camp-hr-benefits",
        campaign_name="Annual Employee Benefits Open Enrollment Notice",
        raw_payload={"email_subject": "HR Notice: Open Enrollment Confirmation Due", "delivered": True},
        processed=True,
        detection_result="NORMAL_CLEAN",
        risk_score=0,
        severity=SeverityLevel.LOW,
        triggered_rules=[],
        detection_reasons=["Simulation delivered: User verified internal benefits portal without clicking suspicious external links."],
        processed_by="CANIPHISH_SIMULATOR",
        incident_id=None
    )
    storage.save_event(e10)

    # 11. Normal User Phishing Simulation: Delivered (Q3 Baseline Drill)
    evt11_id = "evt-seed-caniphish-delivered-11"
    t11 = (now - timedelta(days=26)).isoformat()
    e11 = SecurityEvent(
        event_id=evt11_id,
        timestamp=t11,
        event_type="emailDelivered",
        test_user="user@cloudshield.internal",
        source_ip="192.168.1.100",
        resource="caniphish://campaign/camp-compliance-q3",
        action="simulated_email_delivered",
        session_id="sess-sim-11",
        request_count=1,
        source_platform=SourcePlatform.CANIPHISH,
        source_event_id="cp-ev-005",
        campaign_id="camp-compliance-q3",
        campaign_name="Q3 Security Awareness Baseline Evaluation",
        raw_payload={"email_subject": "Security Office: Quarterly Policy Attestation", "delivered": True},
        processed=True,
        detection_result="NORMAL_CLEAN",
        risk_score=0,
        severity=SeverityLevel.LOW,
        triggered_rules=[],
        detection_reasons=["Simulation delivered: User exhibited safe baseline email hygiene."],
        processed_by="CANIPHISH_SIMULATOR",
        incident_id=None
    )
    storage.save_event(e11)


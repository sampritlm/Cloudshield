RULE_REPEATED_FAILED_LOGIN = "RULE_01_FAILED_LOGIN"
RULE_UNUSUAL_IP = "RULE_02_UNUSUAL_IP"
RULE_UNAUTHORIZED_ACCESS = "RULE_03_UNAUTHORIZED_RESOURCE"
RULE_HIGH_REQUEST_FREQUENCY = "RULE_04_REQUEST_BURST"
RULE_COMBINED_ACTIVITY = "RULE_05_COMBINED_SUSPICIOUS"

# CanIPhish Official Simulation Rule Identifiers
RULE_CANIPHISH_PAYLOAD_CLICKED = "RULE_CP_PAYLOAD_CLICK"
RULE_CANIPHISH_EMPLOYEE_COMPROMISED = "RULE_CP_COMPROMISED"
RULE_CANIPHISH_MULTI_INTERACTION = "RULE_CP_MULTI_SIGNAL"
RULE_CANIPHISH_EMAIL_REPORTED = "RULE_CP_EMAIL_REPORTED"
RULE_CANIPHISH_DELIVERY_FAILED = "RULE_CP_DELIVERY_FAILED"

RULE_METADATA = {
    RULE_REPEATED_FAILED_LOGIN: {
        "title": "Repeated Failed Authentication",
        "description": "5 or more authentication failures detected within the monitoring window.",
        "category": "Credential Abuse / Brute Force",
    },
    RULE_UNUSUAL_IP: {
        "title": "Untrusted / Anomalous Source IP",
        "description": "Traffic originating from an unrecognized IP address outside the trusted perimeter.",
        "category": "Network Anomaly",
    },
    RULE_UNAUTHORIZED_ACCESS: {
        "title": "Unauthorized Resource Access Attempt",
        "description": "Explicit attempt to access restricted sensitive endpoints or cloud credentials.",
        "category": "Privilege Abuse / Data Exfiltration",
    },
    RULE_HIGH_REQUEST_FREQUENCY: {
        "title": "Abnormal High Request Frequency Burst",
        "description": "Request volume exceeding configured thresholds within a short timeframe.",
        "category": "Denial of Service / Scraping",
    },
    RULE_COMBINED_ACTIVITY: {
        "title": "Correlated Multi-Vector Threat",
        "description": "Multiple independent suspicious indicators detected within the same user/session context.",
        "category": "Advanced Persistent Threat / Compromised Account",
    },
    # CanIPhish Categories
    RULE_CANIPHISH_PAYLOAD_CLICKED: {
        "title": "CanIPhish: Phishing Payload Link Clicked",
        "description": "Recipient interacted with an active simulated phishing email link or attachment.",
        "category": "Social Engineering / Phishing Interaction",
    },
    RULE_CANIPHISH_EMPLOYEE_COMPROMISED: {
        "title": "CanIPhish: Employee Compromise Recorded",
        "description": "Recipient entered credentials or submitted unauthorized data on a simulated phishing website.",
        "category": "Credential Harvesting / Account Compromise",
    },
    RULE_CANIPHISH_MULTI_INTERACTION: {
        "title": "CanIPhish: Correlated Phishing Interactions",
        "description": "Multiple suspicious simulation touchpoints recorded for the recipient in the campaign session.",
        "category": "High Vulnerability Human Risk",
    },
    RULE_CANIPHISH_EMAIL_REPORTED: {
        "title": "CanIPhish: Suspicious Phishing Email Reported",
        "description": "Recipient proactively recognized and reported the simulated phishing email (positive defense).",
        "category": "Security Awareness / Proactive Defense",
    },
    RULE_CANIPHISH_DELIVERY_FAILED: {
        "title": "CanIPhish: Simulation Delivery Failure",
        "description": "Mail server or mail gateway rejected simulation email delivery.",
        "category": "Mail Infrastructure / Delivery Issue",
    },
}

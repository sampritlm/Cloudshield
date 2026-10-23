RULE_REPEATED_FAILED_LOGIN = "RULE_01_FAILED_LOGIN"
RULE_UNUSUAL_IP = "RULE_02_UNUSUAL_IP"
RULE_UNAUTHORIZED_ACCESS = "RULE_03_UNAUTHORIZED_RESOURCE"
RULE_HIGH_REQUEST_FREQUENCY = "RULE_04_REQUEST_BURST"
RULE_COMBINED_ACTIVITY = "RULE_05_COMBINED_SUSPICIOUS"

# CanIPhish Official Simulation Rule Identifiers
RULE_CANIPHISH_EMAIL_OPENED = "RULE_CP_EMAIL_OPENED"
RULE_CANIPHISH_PAYLOAD_CLICKED = "RULE_CP_PAYLOAD_CLICK"
RULE_CANIPHISH_WEBSITE_VISITED = "RULE_CP_WEBSITE_VISIT"
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
    RULE_CANIPHISH_EMAIL_OPENED: {
        "title": "CanIPhish: Phishing Email Opened",
        "description": "Recipient opened and viewed an inbound simulated phishing email lure.",
        "category": "Email Threat / Lure Engagement",
    },
    RULE_CANIPHISH_PAYLOAD_CLICKED: {
        "title": "CanIPhish: Phishing Payload Link Clicked",
        "description": "Recipient interacted with an active simulated phishing email link or attachment.",
        "category": "Social Engineering / Phishing Interaction",
    },
    RULE_CANIPHISH_WEBSITE_VISITED: {
        "title": "CanIPhish: Deceptive Phishing Website Accessed",
        "description": "Target navigated to a deceptive login portal masquerading as Google, Microsoft, or LinkedIn on alerting-services.com.",
        "category": "Web Threat / Impersonation Portal",
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

# =========================================================================
# Official CanIPhish Phishing Email Templates Catalog
# =========================================================================
CANIPHISH_EMAIL_TEMPLATES = {
    "Gmail-Blocked-Login": {
        "template_code": "Gmail-Blocked-Login",
        "title": "Gmail Login Attempt Blocked.",
        "difficulty": "Hard",
        "compromise_rate": "31%",
        "payload_type": "Website link (Credential Compromise)",
        "scope": "Global",
        "paired_website": "Google-Login",
        "target_domain": "alerting-services.com",
        "sender": "Google Account Security <no-reply@accounts.google-security-notice.net>",
        "subject": "Security Alert: Suspicious sign-in attempt was blocked",
        "description": "Deceptive Google notification advising user of a blocked foreign sign-in, directing them to an authentic-looking credential harvesting portal."
    },
    "OneDrive-Word-Share": {
        "template_code": "OneDrive-Word-Share",
        "title": "OneDrive Word File Share.",
        "difficulty": "Hard",
        "compromise_rate": "30%",
        "payload_type": "Website link (Cloud Document Link)",
        "scope": "Global",
        "paired_website": "Microsoft-Login",
        "target_domain": "alerting-services.com",
        "sender": "OneDrive Document Sharing <shares@onedrive-corporate-docs.share-link.co>",
        "subject": "Elena Gomez shared 'Q4_Executive_Compensation_Review.docx' with you",
        "description": "Simulates an executive file sharing alert on OneDrive requesting the recipient to authenticate via Microsoft 365 to view confidential documents."
    },
    "Microsoft-Security-Alert": {
        "template_code": "Microsoft-Security-Alert",
        "title": "Email advising that someone else might have accessed their Microsoft account.",
        "difficulty": "Easy",
        "compromise_rate": "14%",
        "payload_type": "Website link (Account Recovery Lure)",
        "scope": "Global",
        "paired_website": "Microsoft-Login",
        "target_domain": "alerting-services.com",
        "sender": "Microsoft Account Security <security-alert@accountprotection-microsoft.security-session.live>",
        "subject": "Microsoft Security Alert: Someone else might have accessed your account",
        "description": "Warns the user that an unauthorized third-party logged in from an overseas IP, urging them to verify single sign-on credentials."
    },
    "HR-Device-Violation": {
        "template_code": "HR-Device-Violation",
        "title": "Email from HR advising the employee has breached the device policy",
        "difficulty": "Hard",
        "compromise_rate": "44%",
        "payload_type": "Website link (Policy Violation / HR Urgency)",
        "scope": "Global",
        "paired_website": "Microsoft-Login",
        "target_domain": "alerting-services.com",
        "sender": "HR Security & Compliance Operations <compliance-audit@internal-hr-device-audit.com>",
        "subject": "URGENT NOTICE: Breached Corporate IT & Personal Device Policy",
        "description": "Leverages severe psychological authority by alleging a corporate compliance infraction, compelling the user to log into an HR audit portal."
    },
    "Linkedin-Password-Reset": {
        "template_code": "Linkedin-Password-Reset",
        "title": "LinkedIn Password Reset Request.",
        "difficulty": "Moderate",
        "compromise_rate": "22%",
        "payload_type": "Website link (Social Media Credential Lure)",
        "scope": "Global",
        "paired_website": "LinkedIn-Login",
        "target_domain": "alerting-services.com",
        "sender": "LinkedIn Security Team <security@linkedin-notifications-center.org>",
        "subject": "LinkedIn: Password reset request for your account",
        "description": "Spoofed security notice claiming a reset was requested from an unrecognized browser, prompting the recipient to cancel by authenticating."
    }
}

# =========================================================================
# Official CanIPhish Deceptive Phishing Websites Catalog
# =========================================================================
CANIPHISH_PHISHING_WEBSITES = {
    "Google-Login": {
        "site_code": "Google-Login",
        "title": "Google Login Portal",
        "description": "Masquerading as the Google login portal.",
        "domain": "alerting-services.com",
        "management_mode": "Managed",
        "provider": "Google Identity / Workspace",
        "landing_url": "https://accounts.google.alerting-services.com/signin/v2",
        "harvested_fields": ["email", "password"],
        "severity_penalty": 50
    },
    "Microsoft-Login": {
        "site_code": "Microsoft-Login",
        "title": "Microsoft Login Portal",
        "description": "Masquerading as the Microsoft Login portal.",
        "domain": "alerting-services.com",
        "management_mode": "Managed",
        "provider": "Microsoft 365 / Azure AD",
        "landing_url": "https://login.microsoftonline.alerting-services.com/common/oauth2",
        "harvested_fields": ["email", "password"],
        "severity_penalty": 50
    },
    "LinkedIn-Login": {
        "site_code": "LinkedIn-Login",
        "title": "LinkedIn Login Portal",
        "description": "Masquerading as the LinkedIn login portal.",
        "domain": "alerting-services.com",
        "management_mode": "Managed",
        "provider": "LinkedIn",
        "landing_url": "https://www.linkedin.alerting-services.com/uas/login",
        "harvested_fields": ["email", "password"],
        "severity_penalty": 50
    }
}


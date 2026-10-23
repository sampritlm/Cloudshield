from datetime import datetime, timezone, timedelta
from typing import List, Optional
from app.config import settings
from app.models.schemas import (
    SecurityEventCreate,
    SecurityEvent,
    DetectionResult,
    RuleTriggerResult,
    SeverityLevel,
    SourcePlatform
)
from app.engine.rules import (
    RULE_REPEATED_FAILED_LOGIN,
    RULE_UNUSUAL_IP,
    RULE_UNAUTHORIZED_ACCESS,
    RULE_HIGH_REQUEST_FREQUENCY,
    RULE_COMBINED_ACTIVITY,
    RULE_CANIPHISH_EMAIL_OPENED,
    RULE_CANIPHISH_PAYLOAD_CLICKED,
    RULE_CANIPHISH_WEBSITE_VISITED,
    RULE_CANIPHISH_EMPLOYEE_COMPROMISED,
    RULE_CANIPHISH_MULTI_INTERACTION,
    RULE_CANIPHISH_EMAIL_REPORTED,
    RULE_CANIPHISH_DELIVERY_FAILED,
    RULE_METADATA,
    CANIPHISH_EMAIL_TEMPLATES,
    CANIPHISH_PHISHING_WEBSITES
)

def classify_severity(score: int) -> SeverityLevel:
    if score <= 30:
        return SeverityLevel.LOW
    elif score <= 60:
        return SeverityLevel.MEDIUM
    elif score <= 80:
        return SeverityLevel.HIGH
    else:
        return SeverityLevel.CRITICAL

def parse_iso(ts_str: str) -> datetime:
    try:
        clean = ts_str.replace("Z", "+00:00")
        return datetime.fromisoformat(clean)
    except Exception:
        return datetime.now(timezone.utc)

class ThreatDetectionEngine:
    def __init__(self, custom_settings=None):
        self.cfg = custom_settings or settings

    def evaluate_event(
        self,
        event: SecurityEventCreate,
        recent_events_for_user: Optional[List[SecurityEvent]] = None,
        recent_events_for_ip: Optional[List[SecurityEvent]] = None,
        now: Optional[datetime] = None
    ) -> DetectionResult:
        current_time = now or datetime.now(timezone.utc)
        recent_user_events = recent_events_for_user or []
        recent_ip_events = recent_events_for_ip or []

        rules_triggered: List[RuleTriggerResult] = []
        reasons: List[str] = []
        is_caniphish = (event.source_platform == SourcePlatform.CANIPHISH)

        # =====================================================================
        # PATH A: CANIPHISH OFFICIAL SIMULATION EVENT PARSER & RISK SCORING
        # =====================================================================
        if is_caniphish:
            event_type_lower = event.event_type.lower()
            raw = event.raw_payload or {}

            # -----------------------------------------------------------------
            # 1. Match Email Threat Template (Catalog of 5 Official Templates)
            # -----------------------------------------------------------------
            matched_template = None
            req_template = (
                raw.get("template_code")
                or raw.get("template")
                or raw.get("templateName")
                or raw.get("emailTemplate")
                or event.campaign_name
                or ""
            )
            for code, tmpl in CANIPHISH_EMAIL_TEMPLATES.items():
                if (
                    code.lower() in req_template.lower()
                    or code.lower() in event.action.lower()
                    or tmpl["title"].lower() in req_template.lower()
                    or tmpl["subject"].lower() in str(raw.get("subject", "")).lower()
                ):
                    matched_template = tmpl
                    break

            # -----------------------------------------------------------------
            # 2. Match Phishing Website (3 Official Portals on alerting-services.com)
            # -----------------------------------------------------------------
            matched_website = None
            req_site = (
                raw.get("phishing_website")
                or raw.get("website")
                or raw.get("site_code")
                or raw.get("landing_page")
                or event.resource
                or ""
            )
            for code, site in CANIPHISH_PHISHING_WEBSITES.items():
                if (
                    code.lower() in req_site.lower()
                    or site["title"].lower() in req_site.lower()
                    or site["landing_url"].lower() in req_site.lower()
                    or code.lower() in event.action.lower()
                ):
                    matched_website = site
                    break

            # Auto-correlate: If template matched but website not given, use paired website
            if not matched_website and matched_template and matched_template.get("paired_website"):
                paired_code = matched_template["paired_website"]
                matched_website = CANIPHISH_PHISHING_WEBSITES.get(paired_code)

            # Auto-correlate: If website matched but template not given, find primary template
            if not matched_template and matched_website:
                for tmpl in CANIPHISH_EMAIL_TEMPLATES.values():
                    if tmpl.get("paired_website") == matched_website["site_code"]:
                        matched_template = tmpl
                        break

            # -----------------------------------------------------------------
            # 3. Detect Action Types across Email Threats & Phishing Websites
            # -----------------------------------------------------------------
            is_reported = (
                "report" in event_type_lower
                or event.event_type == "emailReported"
                or raw.get("emailReported") is True
                or raw.get("action") == "report"
            )

            is_compromised = (
                "compromise" in event_type_lower
                or "harvest" in event_type_lower
                or event.event_type in ["employeeCompromised", "credentialCompromised"]
                or raw.get("employeeCompromised") is True
                or raw.get("employeeCompromisedTime") is not None
                or raw.get("action") == "harvest"
            )

            is_clicked = (
                (
                    "click" in event_type_lower
                    or event.event_type in ["payloadClicked", "linkClicked"]
                    or raw.get("payloadInteraction") is True
                    or raw.get("payloadInteractionTime") is not None
                    or is_compromised
                )
                and not is_reported
            )

            is_site_visited = (
                (
                    ("visit" in event_type_lower and "email" not in event_type_lower)
                    or event.event_type in ["websiteVisited", "landingPageViewed", "siteVisited"]
                    or raw.get("action") == "visit"
                )
                and not is_reported
                and not is_clicked
            )

            is_opened = (
                (
                    "open" in event_type_lower
                    or event.event_type == "emailOpened"
                    or raw.get("emailOpened") is True
                    or raw.get("emailOpenedTime") is not None
                )
                and not is_clicked
                and not is_site_visited
                and not is_compromised
                and not is_reported
            )

            is_delivery_failed = (
                "delivery" in event_type_lower
                or event.event_type == "deliveryFailed"
                or raw.get("deliveryFailed") is True
            )

            # Metadata helpers
            site_name = matched_website["title"] if matched_website else "Deceptive Identity Portal"
            site_code = matched_website["site_code"] if matched_website else "alerting-services.com"
            site_url = matched_website["landing_url"] if matched_website else f"https://{site_code.lower()}.alerting-services.com"
            tmpl_code = matched_template["template_code"] if matched_template else "Generic-Phish-Lure"
            tmpl_title = matched_template["title"] if matched_template else tmpl_code

            # -----------------------------------------------------------------
            # Rule Evaluation: Email Threat Interactions
            # -----------------------------------------------------------------
            # A. Email Opened (+15 pts)
            if is_opened and not is_clicked and not is_compromised:
                rules_triggered.append(
                    RuleTriggerResult(
                        rule_name=RULE_METADATA[RULE_CANIPHISH_EMAIL_OPENED]["title"],
                        rule_code=RULE_CANIPHISH_EMAIL_OPENED,
                        description=f"CanIPhish: Recipient '{event.test_user}' opened email lure '{tmpl_title}' ({tmpl_code}).",
                        points=15,
                        details={
                            "campaign_id": event.campaign_id,
                            "template_code": tmpl_code,
                            "template_title": tmpl_title,
                            "difficulty": matched_template["difficulty"] if matched_template else "Hard",
                            "action": "email_opened"
                        }
                    )
                )
                reasons.append(
                    f"Phishing Email Opened: Recipient '{event.test_user}' opened '{tmpl_title}' ({tmpl_code})."
                )

            # B. Phishing Link Clicked / Payload Interaction (+35 pts)
            if is_clicked:
                rules_triggered.append(
                    RuleTriggerResult(
                        rule_name=RULE_METADATA[RULE_CANIPHISH_PAYLOAD_CLICKED]["title"],
                        rule_code=RULE_CANIPHISH_PAYLOAD_CLICKED,
                        description=f"CanIPhish: Test user '{event.test_user}' clicked lure link in '{tmpl_code}' targeting {site_name}.",
                        points=self.cfg.POINTS_PAYLOAD_CLICKED,
                        details={
                            "campaign_id": event.campaign_id,
                            "template_code": tmpl_code,
                            "template_title": tmpl_title,
                            "phishing_website": site_code,
                            "deceptive_domain": matched_website["domain"] if matched_website else "alerting-services.com",
                            "landing_url": site_url,
                            "action": "payload_clicked"
                        }
                    )
                )
                reasons.append(
                    f"CanIPhish Phishing Link Click: Recipient '{event.test_user}' interacted with '{tmpl_code}' targeting {site_name}."
                )

            # C. Phishing Website Direct Access / Portal Navigation (+35 pts)
            if is_site_visited and not is_clicked:
                rules_triggered.append(
                    RuleTriggerResult(
                        rule_name=RULE_METADATA[RULE_CANIPHISH_WEBSITE_VISITED]["title"],
                        rule_code=RULE_CANIPHISH_WEBSITE_VISITED,
                        description=f"CanIPhish: Navigated to deceptive phishing website {site_name} on alerting-services.com.",
                        points=35,
                        details={
                            "campaign_id": event.campaign_id,
                            "phishing_website": site_code,
                            "deceptive_domain": "alerting-services.com",
                            "landing_url": site_url,
                            "origin_template": tmpl_code
                        }
                    )
                )
                reasons.append(
                    f"Deceptive Phishing Website Accessed: User visited {site_name} ({site_code}) at alerting-services.com."
                )

            # D. Credential Compromise / Account Takeover Risk (+55 pts + Multi-Interaction Bonus)
            if is_compromised:
                rules_triggered.append(
                    RuleTriggerResult(
                        rule_name=RULE_METADATA[RULE_CANIPHISH_EMPLOYEE_COMPROMISED]["title"],
                        rule_code=RULE_CANIPHISH_EMPLOYEE_COMPROMISED,
                        description=f"CanIPhish: Recipient '{event.test_user}' entered credentials on {site_name} (Lure: {tmpl_code}).",
                        points=self.cfg.POINTS_EMPLOYEE_COMPROMISED,
                        details={
                            "campaign_id": event.campaign_id,
                            "template_code": tmpl_code,
                            "template_title": tmpl_title,
                            "difficulty": matched_template["difficulty"] if matched_template else "Hard",
                            "compromise_rate": matched_template["compromise_rate"] if matched_template else "30%",
                            "phishing_website": site_code,
                            "phishing_website_title": site_name,
                            "deceptive_domain": "alerting-services.com",
                            "landing_url": site_url,
                            "harvested_fields": ["email", "password"],
                            "credential_harvest_successful": True,
                            "action": "credentials_compromised"
                        }
                    )
                )
                reasons.append(
                    f"CRITICAL Phishing Compromise: Recipient '{event.test_user}' submitted credentials on {site_name} ({site_code})."
                )

                # Add Multi-Interaction Correlation Escalation
                rules_triggered.append(
                    RuleTriggerResult(
                        rule_name=RULE_METADATA[RULE_CANIPHISH_MULTI_INTERACTION]["title"],
                        rule_code=RULE_CANIPHISH_MULTI_INTERACTION,
                        description=f"CanIPhish: Correlated email click + credential submission on {site_name}.",
                        points=self.cfg.POINTS_COMBINED_INTERACTION_BONUS,
                        details={
                            "interactions": ["payload_clicked", "credential_harvested"],
                            "risk_escalation": "CRITICAL"
                        }
                    )
                )
                reasons.append(
                    f"Correlated Multi-Interaction Escalation: Email link click followed by credential submission (+{self.cfg.POINTS_COMBINED_INTERACTION_BONUS} pts)."
                )

            # E. Positive Defense / Proactive Phishing Email Reported (0 pts, SOC Alert)
            if is_reported:
                rules_triggered.append(
                    RuleTriggerResult(
                        rule_name=RULE_METADATA[RULE_CANIPHISH_EMAIL_REPORTED]["title"],
                        rule_code=RULE_CANIPHISH_EMAIL_REPORTED,
                        description=f"CanIPhish: Recipient '{event.test_user}' proactively identified and reported '{tmpl_title}' to SOC.",
                        points=0,
                        details={
                            "template_code": tmpl_code,
                            "template_title": tmpl_title,
                            "defense_status": "PROACTIVE_DEFENSE_REWARD",
                            "action": "email_reported"
                        }
                    )
                )
                reasons.append(
                    f"CanIPhish Positive Action: Recipient '{event.test_user}' proactively reported '{tmpl_title}' to SOC."
                )

            # F. Phishing Simulation Delivery Failure (0 pts)
            if is_delivery_failed:
                rules_triggered.append(
                    RuleTriggerResult(
                        rule_name=RULE_METADATA[RULE_CANIPHISH_DELIVERY_FAILED]["title"],
                        rule_code=RULE_CANIPHISH_DELIVERY_FAILED,
                        description=f"CanIPhish: Simulation delivery failed for '{tmpl_code}'.",
                        points=0,
                        details={"delivery": "FAILED", "template_code": tmpl_code}
                    )
                )
                reasons.append(f"CanIPhish Delivery Notice: Phishing simulation email delivery failed for '{tmpl_code}'.")

            # Calculate and Cap Score
            raw_score = sum(r.points for r in rules_triggered)
            capped_score = min(100, max(0, raw_score))
            severity = classify_severity(capped_score)
            is_threat = (capped_score > 30)

            return DetectionResult(
                is_threat=is_threat,
                risk_score=capped_score,
                severity=severity,
                reasons=reasons if reasons else ["CanIPhish event received with baseline normal interaction."],
                rules_triggered=rules_triggered,
                processed_by="AWS_LAMBDA_WORKFLOW" if self.cfg.AWS_MODE else "CANIPHISH_INGESTION_ENGINE",
                source_platform=SourcePlatform.CANIPHISH
            )

        # =====================================================================
        # PATH B: LOCAL DEMONSTRATION & CORE NETWORK SECURITY RULES
        # =====================================================================
        # Rule 1: Repeated Failed Login
        is_login_failure = (
            event.event_type in ["LOGIN_FAILURE", "LOGIN_FAILED", "FAILED_LOGIN"]
            or "fail" in event.action.lower()
            or event.raw_payload.get("status") == "failed_login"
            or bool(event.raw_payload.get("simulated_failures"))
        )

        if is_login_failure:
            cutoff = current_time - timedelta(seconds=self.cfg.FAILED_LOGIN_WINDOW_SECONDS)
            past_failed_attempts = 0
            for past in recent_user_events:
                p_time = parse_iso(past.timestamp)
                if p_time >= cutoff and (
                    past.event_type in ["LOGIN_FAILURE", "LOGIN_FAILED", "FAILED_LOGIN"]
                    or "fail" in past.action.lower()
                ):
                    past_failed_attempts += (past.request_count or 1)

            current_attempts = event.request_count if (event.request_count and event.request_count > 1) else 1
            total_failed = past_failed_attempts + current_attempts

            if event.raw_payload and "simulated_failures" in event.raw_payload:
                total_failed = max(total_failed, event.raw_payload["simulated_failures"])

            if total_failed >= self.cfg.FAILED_LOGIN_THRESHOLD:
                rules_triggered.append(
                    RuleTriggerResult(
                        rule_name=RULE_METADATA[RULE_REPEATED_FAILED_LOGIN]["title"],
                        rule_code=RULE_REPEATED_FAILED_LOGIN,
                        description=f"{total_failed} failed login attempts for user '{event.test_user}' within {self.cfg.FAILED_LOGIN_WINDOW_SECONDS}s",
                        points=self.cfg.POINTS_FAILED_LOGIN,
                        details={"total_failed": total_failed, "threshold": self.cfg.FAILED_LOGIN_THRESHOLD}
                    )
                )
                reasons.append(
                    f"Repeated failed login: {total_failed} failed attempts detected for test user '{event.test_user}'."
                )

        # Rule 2: Unusual IP Address
        is_explicit_unusual_type = event.event_type in ["UNUSUAL_IP", "UNUSUAL_IP_ACCESS"]
        is_ip_untrusted = event.source_ip not in self.cfg.TRUSTED_IPS and event.source_ip != "0.0.0.0"

        if is_explicit_unusual_type or is_ip_untrusted:
            rules_triggered.append(
                RuleTriggerResult(
                    rule_name=RULE_METADATA[RULE_UNUSUAL_IP]["title"],
                    rule_code=RULE_UNUSUAL_IP,
                    description=f"Source IP '{event.source_ip}' is outside the authorized trusted IP perimeter.",
                    points=self.cfg.POINTS_UNUSUAL_IP,
                    details={"source_ip": event.source_ip, "trusted_ips": self.cfg.TRUSTED_IPS}
                )
            )
            reasons.append(
                f"Unusual IP address: Source IP '{event.source_ip}' is not present in trusted IP whitelist."
            )

        # Rule 3: Unauthorized Resource Access
        is_restricted_resource = False
        res = (event.resource or "").lower()
        for restricted in self.cfg.RESTRICTED_RESOURCES:
            if restricted.lower() in res or res in restricted.lower():
                is_restricted_resource = True
                break

        is_unauth_action = (
            event.event_type in ["UNAUTHORIZED_ACCESS", "UNAUTHORIZED_RESOURCE_ACCESS"]
            or any(sub in event.action.lower() for sub in ["unauthorized", "forbidden", "access_denied", "privilege_escalation"])
            or event.raw_payload.get("status_code") in [401, 403]
        )

        if is_restricted_resource or is_unauth_action:
            rules_triggered.append(
                RuleTriggerResult(
                    rule_name=RULE_METADATA[RULE_UNAUTHORIZED_ACCESS]["title"],
                    rule_code=RULE_UNAUTHORIZED_ACCESS,
                    description=f"Unauthorized access attempt targeting restricted resource '{event.resource}'.",
                    points=self.cfg.POINTS_UNAUTHORIZED_ACCESS,
                    details={"resource": event.resource, "action": event.action}
                )
            )
            reasons.append(
                f"Unauthorized resource access: Target '{event.resource}' is a restricted cloud asset."
            )

        # Rule 4: High Request Frequency
        cutoff_freq = current_time - timedelta(seconds=self.cfg.HIGH_REQUEST_FREQ_WINDOW_SECONDS)
        freq_count = 0
        for past in recent_ip_events:
            p_time = parse_iso(past.timestamp)
            if p_time >= cutoff_freq:
                freq_count += (past.request_count or 1)

        current_reqs = event.request_count if (event.request_count and event.request_count > 1) else 1
        total_freq = freq_count + current_reqs

        if event.raw_payload and "simulated_request_burst" in event.raw_payload:
            total_freq = max(total_freq, event.raw_payload["simulated_request_burst"])

        is_freq_burst_event = (
            event.event_type in ["HIGH_REQUEST_FREQUENCY", "API_REQUEST_BURST"]
            or total_freq >= self.cfg.HIGH_REQUEST_FREQ_THRESHOLD
        )

        if is_freq_burst_event:
            count_to_report = max(total_freq, self.cfg.HIGH_REQUEST_FREQ_THRESHOLD)
            rules_triggered.append(
                RuleTriggerResult(
                    rule_name=RULE_METADATA[RULE_HIGH_REQUEST_FREQUENCY]["title"],
                    rule_code=RULE_HIGH_REQUEST_FREQUENCY,
                    description=f"High request burst of {count_to_report} calls within {self.cfg.HIGH_REQUEST_FREQ_WINDOW_SECONDS}s.",
                    points=self.cfg.POINTS_HIGH_REQUEST_FREQ,
                    details={"total_requests": count_to_report, "threshold": self.cfg.HIGH_REQUEST_FREQ_THRESHOLD}
                )
            )
            reasons.append(
                f"High request frequency: Burst rate reached {count_to_report} requests in {self.cfg.HIGH_REQUEST_FREQ_WINDOW_SECONDS}s window."
            )

        # Rule 5: Combined Suspicious Activity
        base_rules_count = len(rules_triggered)
        is_explicit_combined = (
            event.event_type in ["COMBINED_SUSPICIOUS", "COMBINED_SUSPICIOUS_ACTIVITY"]
            or event.raw_payload.get("combined_scenario") is True
        )

        if base_rules_count >= 2 or is_explicit_combined:
            rules_triggered.append(
                RuleTriggerResult(
                    rule_name=RULE_METADATA[RULE_COMBINED_ACTIVITY]["title"],
                    rule_code=RULE_COMBINED_ACTIVITY,
                    description=f"Multiple distinct threat vectors correlated ({base_rules_count} signals detected).",
                    points=self.cfg.POINTS_COMBINED_BONUS,
                    details={"signals_count": base_rules_count}
                )
            )
            reasons.append(
                f"Combined suspicious activity: Multi-vector correlation triggered bonus risk escalation."
            )

        raw_score = sum(r.points for r in rules_triggered)
        capped_score = min(100, max(0, raw_score))
        severity = classify_severity(capped_score)
        is_threat = (len(rules_triggered) > 0 and capped_score > 0)

        execution_mode = "AWS_LAMBDA_WORKFLOW" if self.cfg.AWS_MODE else "LOCAL_SIMULATOR"

        return DetectionResult(
            is_threat=is_threat,
            risk_score=capped_score,
            severity=severity,
            reasons=reasons if reasons else ["Normal standard activity within acceptable operational baseline."],
            rules_triggered=rules_triggered,
            processed_by=execution_mode,
            source_platform=SourcePlatform.LOCAL_SIMULATION
        )

engine = ThreatDetectionEngine()

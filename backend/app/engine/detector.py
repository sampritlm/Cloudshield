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
    RULE_CANIPHISH_PAYLOAD_CLICKED,
    RULE_CANIPHISH_EMPLOYEE_COMPROMISED,
    RULE_CANIPHISH_MULTI_INTERACTION,
    RULE_CANIPHISH_EMAIL_REPORTED,
    RULE_CANIPHISH_DELIVERY_FAILED,
    RULE_METADATA
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

            is_clicked = (
                "click" in event_type_lower
                or event.event_type == "payloadClicked"
                or raw.get("payloadInteraction") is True
                or raw.get("payloadInteractionTime") is not None
            )

            is_compromised = (
                "compromise" in event_type_lower
                or event.event_type == "employeeCompromised"
                or raw.get("employeeCompromised") is True
                or raw.get("employeeCompromisedTime") is not None
            )

            is_reported = (
                "report" in event_type_lower
                or event.event_type == "emailReported"
                or raw.get("emailReported") is True
            )

            is_delivery_failed = (
                "delivery" in event_type_lower
                or event.event_type == "deliveryFailed"
                or raw.get("deliveryFailed") is True
            )

            # 1. Payload Click (+30 pts)
            if is_clicked:
                rules_triggered.append(
                    RuleTriggerResult(
                        rule_name=RULE_METADATA[RULE_CANIPHISH_PAYLOAD_CLICKED]["title"],
                        rule_code=RULE_CANIPHISH_PAYLOAD_CLICKED,
                        description=f"CanIPhish: Test user '{event.test_user}' clicked phishing payload link.",
                        points=self.cfg.POINTS_PAYLOAD_CLICKED,
                        details={"campaign_id": event.campaign_id, "action": event.action}
                    )
                )
                reasons.append(
                    f"CanIPhish Phishing Click: Recipient '{event.test_user}' interacted with phishing link/attachment."
                )

            # 2. Employee Compromised (+50 pts)
            if is_compromised:
                rules_triggered.append(
                    RuleTriggerResult(
                        rule_name=RULE_METADATA[RULE_CANIPHISH_EMPLOYEE_COMPROMISED]["title"],
                        rule_code=RULE_CANIPHISH_EMPLOYEE_COMPROMISED,
                        description=f"CanIPhish: Test user '{event.test_user}' entered credentials or fell for simulated compromise.",
                        points=self.cfg.POINTS_EMPLOYEE_COMPROMISED,
                        details={"campaign_id": event.campaign_id, "action": event.action}
                    )
                )
                reasons.append(
                    f"CanIPhish Credential Compromise: Recipient '{event.test_user}' compromised credentials in simulated attack."
                )

            # 3. Correlated Multiple Interactions (+20 pts)
            if (is_clicked and is_compromised) or (len(recent_user_events) > 0 and (is_clicked or is_compromised)):
                rules_triggered.append(
                    RuleTriggerResult(
                        rule_name=RULE_METADATA[RULE_CANIPHISH_MULTI_INTERACTION]["title"],
                        rule_code=RULE_CANIPHISH_MULTI_INTERACTION,
                        description=f"CanIPhish: Multiple correlated phishing interactions within same campaign session.",
                        points=self.cfg.POINTS_COMBINED_INTERACTION_BONUS,
                        details={"interactions": 2}
                    )
                )
                reasons.append(
                    f"CanIPhish Multi-Interaction Bonus: Correlated click + compromise signals escalated risk (+{self.cfg.POINTS_COMBINED_INTERACTION_BONUS} pts)."
                )

            # 4. Email Reported (Positive Defense, 0 pts)
            if is_reported:
                rules_triggered.append(
                    RuleTriggerResult(
                        rule_name=RULE_METADATA[RULE_CANIPHISH_EMAIL_REPORTED]["title"],
                        rule_code=RULE_CANIPHISH_EMAIL_REPORTED,
                        description=f"CanIPhish: Recipient '{event.test_user}' proactively reported the simulated phishing email.",
                        points=0,
                        details={"status": "REPORTED_BENIGN"}
                    )
                )
                reasons.append(
                    f"CanIPhish Positive Action: Recipient '{event.test_user}' successfully identified and reported the email."
                )

            # 5. Delivery Failed (0 pts)
            if is_delivery_failed:
                rules_triggered.append(
                    RuleTriggerResult(
                        rule_name=RULE_METADATA[RULE_CANIPHISH_DELIVERY_FAILED]["title"],
                        rule_code=RULE_CANIPHISH_DELIVERY_FAILED,
                        description=f"CanIPhish: Phishing email delivery failed.",
                        points=0,
                        details={"delivery": "FAILED"}
                    )
                )
                reasons.append("CanIPhish Notice: Delivery failed to destination mail server.")

            # Calculate and Cap
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

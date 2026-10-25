import os
import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Set
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse

from app.auth import get_current_user, UserProfile, verify_password, get_password_hash, DEMO_USERS_DB
from app.storage import get_storage
from app.models.schemas import SeverityLevel

router = APIRouter(prefix="/api/user/portal", tags=["Normal User Security Portal"])

# In-memory tracking for user training progress, preferences & notification read states
USER_TRAINING_STATE: Dict[str, Dict[str, Any]] = {}
USER_PREFERENCES_STATE: Dict[str, Dict[str, Any]] = {}
USER_NOTIFICATION_READ_STATE: Dict[str, Set[str]] = {}

STATIC_RESOURCES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static_resources"))

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UserPreferencesRequest(BaseModel):
    email_alerts: Optional[bool] = True
    simulation_summaries: Optional[bool] = True
    training_reminders: Optional[bool] = True

INITIAL_LESSONS = [
    {
        "id": "les-01",
        "title": "Spotting Deceptive Domain Spoofing & Lookalikes",
        "category": "Email Security",
        "duration": "5 mins",
        "badge": "Domain Detective",
        "description": "Learn how attackers register lookalike typosquatted domains (e.g., micr0soft.com, payroll-cloud.co) and how to inspect the true sender address.",
        "key_takeaways": [
            "Check the full header or hover over sender name to view actual email address",
            "Watch out for substituted characters (e.g. 0 instead of O, rn instead of m)",
            "Never trust display names alone; attackers frequently forge sender names"
        ]
    },
    {
        "id": "les-02",
        "title": "Urgency Traps & Psychological Pressure Tactics",
        "category": "Threat Tactics",
        "duration": "7 mins",
        "badge": "Vigilance First",
        "description": "Phishing simulations often simulate urgent financial or HR consequences (e.g., 'Account locked in 2 hours', 'Overdue bonus wire').",
        "key_takeaways": [
            "Artificial urgency is the #1 psychological lever used in phishing",
            "Slow down and independently verify requests via a secondary communication channel",
            "Legitimate internal departments rarely demand instant password updates via email links"
        ]
    },
    {
        "id": "les-03",
        "title": "Safe Link Inspection & Credential Harvesting Protection",
        "category": "Browser Safety",
        "duration": "6 mins",
        "badge": "Link Inspector",
        "description": "How to inspect hyperlinked text without clicking, understand URL query parameters, and verify SSL certificates.",
        "key_takeaways": [
            "Hover over hyperlinks to preview destination URL before clicking",
            "Check for suspicious top-level domains (.xyz, .top, .live) and redirection services",
            "If directed to an unfamiliar login form, close the tab and notify Security"
        ]
    },
    {
        "id": "les-04",
        "title": "How to Report Phishing via CloudShield",
        "category": "Incident Reporting",
        "duration": "4 mins",
        "badge": "SOC Defender",
        "description": "Reporting suspicious emails directly helps SOC analysts block attack campaigns across the entire organization within minutes.",
        "key_takeaways": [
            "Reporting a phishing email awards positive points (+20) in your CloudShield awareness score",
            "Do not forward the email to colleagues; use the integrated Report Phish mechanism",
            "SOC automatically evaluates the campaign payload and neutralizes similar emails"
        ]
    }
]

def get_user_events_and_simulations(user_email: str):
    """
    Filters events specifically for the authenticated user only.
    Normal users never receive data for any other user.
    """
    storage = get_storage()
    all_events, _ = storage.list_events(limit=500)
    user_email_lower = user_email.lower()

    # User's own events
    user_events = [
        e for e in all_events
        if e.test_user.lower() == user_email_lower
    ]

    # Phishing simulations (CanIPhish or simulated phishing scenarios)
    simulations = []
    for e in user_events:
        is_caniphish = (e.source_platform.value == "CANIPHISH") if hasattr(e.source_platform, "value") else (e.source_platform == "CANIPHISH")
        is_phish_event = is_caniphish or "phish" in e.event_type.lower() or "click" in e.event_type.lower() or "compromise" in e.event_type.lower() or "report" in e.event_type.lower()
        
        if is_phish_event:
            # Determine outcome
            is_clicked = "click" in e.action.lower() or "click" in e.event_type.lower() or "compromise" in e.event_type.lower()
            is_reported = "report" in e.action.lower() or "report" in e.event_type.lower()
            
            explanation = ""
            if is_reported:
                explanation = "Excellent response: You identified the phishing indicators in this simulation and promptly reported it to Security Operations."
            elif is_clicked:
                explanation = "Caution advised: The simulated phishing link was clicked. Review the sender domain and urgency indicators to avoid credential exposure."
            else:
                explanation = "Simulation delivered: Email received and no risky link interaction was recorded."

            camp_name = e.campaign_name or e.raw_payload.get("campaign_name") or (
                "Simulated Phishing Lure" if not is_caniphish else "CanIPhish Scheduled Campaign"
            )

            simulations.append({
                "simulation_id": e.event_id,
                "campaign_name": camp_name,
                "campaign_id": e.campaign_id,
                "received_at": e.timestamp,
                "delivery_status": "DELIVERED",
                "link_clicked": is_clicked,
                "clicked_at": e.timestamp if is_clicked else None,
                "email_reported": is_reported,
                "reported_at": e.timestamp if is_reported else None,
                "training_status": "COMPLETED" if is_reported else ("RECOMMENDED" if is_clicked else "NOT_REQUIRED"),
                "risk_score": e.risk_score,
                "severity": e.severity.value,
                "explanation": explanation
            })

    return user_events, simulations

@router.get("/dashboard")
async def get_user_dashboard(current_user: UserProfile = Depends(get_current_user)):
    """
    Returns the normal user's personal security-awareness score,
    simulations count, link click statistics, reported emails, and recent activity.
    """
    user_events, simulations = get_user_events_and_simulations(current_user.email)

    total_sims = len(simulations)
    clicks = sum(1 for s in simulations if s["link_clicked"])
    reports = sum(1 for s in simulations if s["email_reported"])

    # Identify user security infractions (unauthorized resource access, policy breaks)
    unauthorized_events = [
        e for e in user_events
        if e.risk_score > 0 and (
            "UNAUTHORIZED" in e.event_type.upper()
            or "RESOURCE" in e.event_type.upper()
            or any("RULE_03" in r for r in (e.triggered_rules or []))
        )
    ]
    threat_penalty = sum(e.risk_score for e in unauthorized_events)

    # Calculate deterministic Personal Security-Awareness Score (0 - 100)
    # Starts at 85 baseline.
    # +15 for each reported phish (up to +30)
    # -25 for each clicked link
    # Direct penalty for unauthorized resource access (-45 pts per violation)
    base_score = 85
    base_score += min(30, reports * 15)
    base_score -= (clicks * 25)
    base_score -= threat_penalty
    awareness_score = max(5, min(100, base_score))

    if threat_penalty > 0 or awareness_score < 50:
        risk_category = "HIGH"
        risk_category_title = f"High Risk ({len(unauthorized_events)} Unauthorized Asset Violation{'s' if len(unauthorized_events) > 1 else ''})" if unauthorized_events else "High Risk / Needs Training Refresher"
    elif awareness_score >= 80:
        risk_category = "LOW"
        risk_category_title = "Cyber Aware / Low Risk"
    else:
        risk_category = "MEDIUM"
        risk_category_title = "Moderate Vigilance"

    # Training completion
    user_completed_lessons = USER_TRAINING_STATE.get(current_user.email, {}).get("completed_ids", ["les-01", "les-04"])
    training_completion_pct = int((len(user_completed_lessons) / len(INITIAL_LESSONS)) * 100)

    # Activity timeline
    recent_activity = []
    # Prepend unauthorized resource access infractions at the top of recent activity
    for e in unauthorized_events:
        file_target = e.resource.split("/")[-1] if e.resource else "Restricted Asset"
        recent_activity.append({
            "type": "UNAUTHORIZED_ACCESS",
            "title": f"Unauthorized Access Detected: {file_target}",
            "timestamp": e.timestamp,
            "badge": f"+{e.risk_score} Risk Added",
            "badge_color": "text-rose-700 bg-rose-50 border-rose-200"
        })

    for s in simulations[:6]:
        if s["email_reported"]:
            recent_activity.append({
                "type": "REPORTED",
                "title": f"Reported Phishing Simulation: {s['campaign_name']}",
                "timestamp": s["received_at"],
                "badge": "+15 Awareness Pts",
                "badge_color": "text-emerald-700 bg-emerald-50 border-emerald-200"
            })
        elif s["link_clicked"]:
            recent_activity.append({
                "type": "CLICKED",
                "title": f"Clicked Simulated Link: {s['campaign_name']}",
                "timestamp": s["received_at"],
                "badge": "-25 Risk Penalty",
                "badge_color": "text-rose-700 bg-rose-50 border-rose-200"
            })
        else:
            recent_activity.append({
                "type": "DELIVERED",
                "title": f"Received Phishing Simulation: {s['campaign_name']}",
                "timestamp": s["received_at"],
                "badge": "No Action Taken",
                "badge_color": "text-slate-700 bg-slate-50 border-slate-200"
            })

    # Calculate performance over time chronologically
    sorted_sims_chrono = sorted(simulations, key=lambda x: x["received_at"])
    perf_history = []
    
    running_score = 85
    if sorted_sims_chrono:
        first_time = sorted_sims_chrono[0]["received_at"]
        try:
            dt = datetime.fromisoformat(first_time.replace("Z", "+00:00"))
            baseline_dt = dt - timedelta(days=7)
            baseline_iso = baseline_dt.isoformat()
        except Exception:
            baseline_iso = first_time

        perf_history.append({
            "timestamp": baseline_iso,
            "date": baseline_iso[:10] if len(baseline_iso) >= 10 else "Baseline",
            "score": 85,
            "campaign": "Initial Onboarding Baseline",
            "outcome": "Onboarding Baseline (85 pts)"
        })
    else:
        now_iso = datetime.now(timezone.utc).isoformat()
        perf_history.append({
            "timestamp": now_iso,
            "date": now_iso[:10],
            "score": 85,
            "campaign": "Initial Onboarding Baseline",
            "outcome": "Onboarding Baseline (85 pts)"
        })

    for s in sorted_sims_chrono:
        if s["email_reported"]:
            running_score = min(100, running_score + 15)
            outcome_lbl = "Reported (+15 pts)"
        elif s["link_clicked"]:
            running_score = max(20, running_score - 25)
            outcome_lbl = "Link Clicked (-25 pts)"
        else:
            outcome_lbl = "Delivered (Safe Hygiene)"
        
        perf_history.append({
            "timestamp": s["received_at"],
            "date": s["received_at"][:10] if len(s["received_at"]) >= 10 else s["received_at"],
            "score": running_score,
            "campaign": s["campaign_name"],
            "outcome": outcome_lbl
        })

    # Dynamic security tips based on simulation outcomes
    outcome_tips = []
    if clicks > 0:
        outcome_tips.append({
            "id": "tip-link-inspection",
            "category": "Link Inspection & Spoofing",
            "title": "Inspect Link Destination Before Clicking",
            "tip": (
                "You interacted with a simulated phishing link in a recent exercise. Attackers craft domains resembling authentic services "
                "(e.g., login-m365.xyz instead of microsoft.com). Always hover over links to verify the actual domain before clicking."
            ),
            "severity": "HIGH",
            "icon": "AlertTriangle"
        })
        outcome_tips.append({
            "id": "tip-urgency-redflag",
            "category": "Social Engineering",
            "title": "Beware of Artificial Urgency & Fear Tactics",
            "tip": (
                "Simulations often mimic urgent notices such as 'Mandatory Password Reset' or 'Overdue Audit'. "
                "Attackers use panic to rush you past red flags. Take a 30-second pause to independently check the sender."
            ),
            "severity": "MEDIUM",
            "icon": "Clock"
        })
    if reports > 0:
        outcome_tips.append({
            "id": "tip-reporting-impact",
            "category": "SOC Vigilance",
            "title": "Reporting Suspicious Emails Directly Shields Colleagues",
            "tip": (
                f"You successfully reported {reports} simulated phishing attempt(s). In CloudShield's AWS pipeline, reporting routes "
                "events via EventBridge and triggers automated rules that help SOC block similar phishing campaigns enterprise-wide."
            ),
            "severity": "LOW",
            "icon": "ShieldCheck"
        })
    
    outcome_tips.append({
        "id": "tip-credential-protection",
        "category": "Credential Security",
        "title": "MFA & Authentication Vigilance",
        "tip": (
            "Never approve an unsolicited Multi-Factor Authentication push notification or enter credentials on any page "
            "opened from an unexpected email. CloudShield evaluates unverified credential submission as a high-risk security infraction."
        ),
        "severity": "LOW",
        "icon": "KeyRound"
    })

    # Detailed training progress
    modules_summary = []
    for les in INITIAL_LESSONS:
        is_done = les["id"] in user_completed_lessons
        modules_summary.append({
            "id": les["id"],
            "title": les["title"],
            "category": les["category"],
            "duration": les["duration"],
            "badge": les.get("badge"),
            "completed": is_done
        })
    next_rec = next((m for m in modules_summary if not m["completed"]), None)

    training_progress_data = {
        "completion_percentage": training_completion_pct,
        "completed_count": len(user_completed_lessons),
        "total_lessons": len(INITIAL_LESSONS),
        "modules": modules_summary,
        "next_recommended": next_rec
    }

    # Latest simulations (sorted newest first)
    latest_sims = sorted(simulations, key=lambda x: x["received_at"], reverse=True)[:5]

    return {
        "user_name": current_user.name,
        "user_email": current_user.email,
        "role": current_user.role.value,
        "awareness_score": awareness_score,
        "risk_category": risk_category,
        "risk_category_title": risk_category_title,
        "threat_risk_score": threat_penalty,
        "threat_events_count": len(unauthorized_events),
        "simulations_received": total_sims,
        "links_clicked": clicks,
        "emails_reported": reports,
        "training_completion_rate": training_completion_pct,
        "recent_activity": recent_activity,
        "latest_simulations": latest_sims,
        "performance_over_time": perf_history,
        "outcome_based_tips": outcome_tips,
        "training_progress": training_progress_data
    }

@router.get("/simulations")
async def get_user_simulations(current_user: UserProfile = Depends(get_current_user)):
    """
    Returns only the authenticated user's own phishing simulation results,
    campaign titles, delivery dates, and plain-language explanations.
    """
    _, simulations = get_user_events_and_simulations(current_user.email)
    return simulations

@router.get("/insights")
async def get_user_security_insights(current_user: UserProfile = Depends(get_current_user)):
    """
    Returns personal risk category, performance comparison, actionable recommendations,
    and explanation of CloudShield rule-based scoring methodology.
    """
    user_events, simulations = get_user_events_and_simulations(current_user.email)
    clicks = sum(1 for s in simulations if s["link_clicked"])
    reports = sum(1 for s in simulations if s["email_reported"])
    unauthorized_events = [
        e for e in user_events
        if e.risk_score > 0 and (
            "UNAUTHORIZED" in e.event_type.upper()
            or "RESOURCE" in e.event_type.upper()
            or any("RULE_03" in r for r in (e.triggered_rules or []))
        )
    ]
    threat_penalty = sum(e.risk_score for e in unauthorized_events)

    base_score = 85 + min(30, reports * 15) - (clicks * 25) - threat_penalty
    current_score = max(5, min(100, base_score))
    previous_score = max(5, min(100, current_score - 10 if reports > clicks else current_score + 15))
    score_delta = current_score - previous_score

    reasons = []
    recommendations = []

    if unauthorized_events:
        reasons.append(f"CRITICAL: {len(unauthorized_events)} unauthorized attempt(s) targeting restricted cloud assets detected (+{threat_penalty} risk score penalty).")
        recommendations.append("Adhere strictly to corporate RBAC permissions; unauthorized resource access triggers SOC security incident tickets.")

    if reports > 0:
        reasons.append(f"Successfully identified and reported {reports} simulated phishing attempt(s) to SOC.")
    if clicks > 0:
        reasons.append(f"Recorded {clicks} simulated link interaction(s) during security testing exercises.")
    elif not unauthorized_events:
        reasons.append("Zero unverified credential submissions or malicious link clicks recorded.")

    if not unauthorized_events:
        reasons.append("Continuous compliance adherence with zero unauthorized resource access infractions.")

    if clicks > 0:
        recommendations.append("Always verify the full sender domain before clicking links in urgent emails.")
        recommendations.append("Complete the 'Spotting Deceptive Domain Spoofing' refresher module.")
    else:
        recommendations.append("Keep up your high vigilance: continue using the Report Phish button for suspicious emails.")
    
    recommendations.append("Never share multi-factor authentication (MFA) codes over email or chat.")
    recommendations.append("Hover over hyperlinks to verify destination URLs match legitimate company services.")

    category_label = "Low Risk / Cyber Aware" if current_score >= 80 else ("Moderate Vigilance" if current_score >= 50 else "High Risk / Needs Training")

    return {
        "awareness_score": current_score,
        "risk_category": "LOW" if current_score >= 80 else ("MEDIUM" if current_score >= 50 else "HIGH"),
        "category_label": category_label,
        "current_score": current_score,
        "previous_score": previous_score,
        "score_delta": score_delta,
        "reasons": reasons,
        "recommendations": recommendations,
        "methodology_explanation": (
            "CloudShield calculates your personal security score using deterministic rule-based evaluation. "
            "Reporting simulated phishing exercises earns positive security credits (+15 pts), while clicking unverified "
            "links deducts risk points (-25 pts). This score reflects your individual cyber awareness and helps identify "
            "when refresher learning materials may be beneficial."
        )
    }

@router.get("/learning")
async def get_user_learning_materials(current_user: UserProfile = Depends(get_current_user)):
    """
    Returns educational lessons, phishing identification tips, and completion status.
    """
    completed_ids = USER_TRAINING_STATE.get(current_user.email, {}).get("completed_ids", ["les-01", "les-04"])

    modules = []
    for les in INITIAL_LESSONS:
        is_done = les["id"] in completed_ids
        modules.append({
            **les,
            "completed": is_done,
            "completed_at": "2026-03-01T10:00:00Z" if is_done else None
        })

    return {
        "modules": modules,
        "total_lessons": len(modules),
        "completed_count": len([m for m in modules if m["completed"]]),
        "completion_percentage": int((len([m for m in modules if m["completed"]]) / len(modules)) * 100)
    }

@router.post("/learning/{lesson_id}/complete")
async def toggle_lesson_completion(
    lesson_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Marks an educational lesson as completed.
    """
    if current_user.email not in USER_TRAINING_STATE:
        USER_TRAINING_STATE[current_user.email] = {"completed_ids": ["les-01", "les-04"]}

    completed_ids = set(USER_TRAINING_STATE[current_user.email]["completed_ids"])
    if lesson_id in completed_ids:
        completed_ids.remove(lesson_id)
        status_msg = "marked as in-progress"
    else:
        completed_ids.add(lesson_id)
        status_msg = "marked as completed"

    USER_TRAINING_STATE[current_user.email]["completed_ids"] = list(completed_ids)

    return {
        "status": "SUCCESS",
        "lesson_id": lesson_id,
        "message": f"Lesson {lesson_id} {status_msg}",
        "completed_ids": list(completed_ids)
    }

# =============================================================================
# Downloadable Security Resources Library (6 Categories, Real Files)
# =============================================================================
DOWNLOADABLE_RESOURCES = [
    # 1. Phishing awareness (ALLOWED)
    {
        "id": "res-phish-guide-pdf",
        "title": "CloudShield Phishing Identification Guide",
        "category": "Phishing Awareness",
        "description": "Comprehensive reference guide on spotting deceptive domains, lookalike senders, artificial urgency, and malicious payload links.",
        "file_name": "CloudShield_Phishing_Identification_Guide.pdf",
        "file_type": "PDF",
        "file_size": "1.4 KB",
        "badge": "General Access",
        "version": "v2.4",
        "last_updated": "2026-03-15",
        "restricted": False,
        "required_role": "user"
    },
    {
        "id": "res-phish-checklist-docx",
        "title": "Email Red Flags & Sender Verification Checklist",
        "category": "Phishing Awareness",
        "description": "Operational step-by-step checklist for employees inspecting suspicious incoming communications before interacting.",
        "file_name": "Email_Red_Flags_Quick_Checklist.docx",
        "file_type": "DOCX",
        "file_size": "1.3 KB",
        "badge": "General Access",
        "version": "v1.8",
        "last_updated": "2026-03-12",
        "restricted": False,
        "required_role": "user"
    },
    # 2. Security policies (MIXED: ALLOWED & RESTRICTED)
    {
        "id": "res-policy-info-pdf",
        "title": "Corporate Information Security Policy (Executive IAM & Root Ledger)",
        "category": "Security Policies",
        "description": "Confidential enterprise security governance containing root cloud keys, IAM administrator policies, and legal audit appendices.",
        "file_name": "Corporate_Information_Security_Policy_2026.pdf",
        "file_type": "PDF",
        "file_size": "1.5 KB",
        "badge": "Classified Asset",
        "version": "2026.1-CONFIDENTIAL",
        "last_updated": "2026-01-10",
        "restricted": True,
        "required_role": "admin"
    },
    {
        "id": "res-policy-acceptable-docx",
        "title": "Acceptable Use & Cloud Asset Protection Policy",
        "category": "Security Policies",
        "description": "Details authorized usage limits for corporate computing assets, cloud IAM credentials, and remote network access.",
        "file_name": "Acceptable_Use_and_Cloud_Asset_Policy.docx",
        "file_type": "DOCX",
        "file_size": "1.3 KB",
        "badge": "General Access",
        "version": "v3.0",
        "last_updated": "2026-02-01",
        "restricted": False,
        "required_role": "user"
    },
    # 3. Password and MFA (ALLOWED)
    {
        "id": "res-pass-mfa-pdf",
        "title": "Password Security & MFA Configuration Guide",
        "category": "Password & MFA",
        "description": "Illustrated guide on generating strong passphrases, setting up FIDO2 hardware keys, and configuring authenticator apps.",
        "file_name": "Password_Security_and_MFA_Setup_Guide.pdf",
        "file_type": "PDF",
        "file_size": "1.5 KB",
        "badge": "General Access",
        "version": "v2.1",
        "last_updated": "2026-03-01",
        "restricted": False,
        "required_role": "user"
    },
    {
        "id": "res-pass-token-docx",
        "title": "Hardware Token & Authenticator Instructions",
        "category": "Password & MFA",
        "description": "Step-by-step walkthrough for configuring mobile authenticator apps (Google/Microsoft Authenticator) and backup codes.",
        "file_name": "Hardware_Token_and_Authenticator_Instructions.docx",
        "file_type": "DOCX",
        "file_size": "1.3 KB",
        "badge": "General Access",
        "version": "v1.5",
        "last_updated": "2026-02-20",
        "restricted": False,
        "required_role": "user"
    },
    # 4. Incident response (RESTRICTED SENSITIVE PROCEDURES)
    {
        "id": "res-inc-playbook-pdf",
        "title": "Incident Response Playbook (Root Credentials & Red Team SOP)",
        "category": "Incident Response",
        "description": "Restricted SOC procedures for emergency credential revocation, database isolation, and root IAM compromise containment.",
        "file_name": "Employee_Security_Incident_Response_Playbook.pdf",
        "file_type": "PDF",
        "file_size": "1.5 KB",
        "badge": "Restricted SecOps",
        "version": "v4.0-SEC",
        "last_updated": "2026-03-18",
        "restricted": True,
        "required_role": "admin"
    },
    {
        "id": "res-inc-breach-docx",
        "title": "Suspected Breach Procedures (Vault Master Passwords Recovery)",
        "category": "Incident Response",
        "description": "Classified operational instructions detailing master database vault emergency recovery and cryptographic salt rotation.",
        "file_name": "Suspected_Breach_Immediate_Action_Procedures.docx",
        "file_type": "DOCX",
        "file_size": "1.3 KB",
        "badge": "Restricted Vault",
        "version": "v2.2-RESTRICTED",
        "last_updated": "2026-03-05",
        "restricted": True,
        "required_role": "admin"
    },
    # 5. Security training (ALLOWED)
    {
        "id": "res-train-slides-pptx",
        "title": "CloudShield Security Awareness Training Presentation",
        "category": "Security Training",
        "description": "Executive and employee slide deck on modern cyber threats, cloud perimeter defense, and social engineering vectors.",
        "file_name": "CloudShield_Security_Awareness_Training_Q1_2026.pptx",
        "file_type": "PPTX",
        "file_size": "1.8 KB",
        "badge": "General Access",
        "version": "Q1 2026",
        "last_updated": "2026-03-20",
        "restricted": False,
        "required_role": "user"
    },
    {
        "id": "res-train-handout-pdf",
        "title": "Social Engineering & Phishing Tactics Handout",
        "category": "Security Training",
        "description": "Visual 1-page summary of common deception tactics: spear phishing, pretexting, urgency traps, and spoofed authentication portals.",
        "file_name": "Phishing_and_Social_Engineering_Handout.pdf",
        "file_type": "PDF",
        "file_size": "1.4 KB",
        "badge": "General Access",
        "version": "v1.9",
        "last_updated": "2026-03-10",
        "restricted": False,
        "required_role": "user"
    },
    # 6. Reference materials (MIXED: ALLOWED & RESTRICTED)
    {
        "id": "res-ref-hygiene-csv",
        "title": "CloudShield Security Hygiene Audit Checklist",
        "category": "Reference Materials",
        "description": "Structured machine-readable checklist tracking essential cyber hygiene controls, verification frequencies, and enforcement criteria.",
        "file_name": "CloudShield_Security_Hygiene_Checklist.csv",
        "file_type": "CSV",
        "file_size": "548 B",
        "badge": "General Access",
        "version": "v2.0",
        "last_updated": "2026-03-14",
        "restricted": False,
        "required_role": "user"
    },
    {
        "id": "res-ref-audit-xlsx",
        "title": "Employee Vigilance Audit Log (Internal SOC Surveillance DB)",
        "category": "Reference Materials",
        "description": "Classified tracking spreadsheet containing complete organization-wide telemetry, user risk scores, and employee audit IDs.",
        "file_name": "Employee_Vigilance_Audit_Log.xlsx",
        "file_type": "XLSX",
        "file_size": "2.0 KB",
        "badge": "Classified DB",
        "version": "v1.2-INTERNAL",
        "last_updated": "2026-03-16",
        "restricted": True,
        "required_role": "admin"
    }
]

@router.get("/library/resources")
@router.get("/resources")
async def get_downloadable_resources(current_user: UserProfile = Depends(get_current_user)):
    """
    Returns the searchable library of downloadable security resources across 6 categories.
    Indicates which resources are allowed for general employee access and which are restricted.
    """
    return DOWNLOADABLE_RESOURCES

@router.get("/library/resources/{resource_id}/download")
@router.get("/resources/{resource_id}/download")
async def download_resource_file(
    resource_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Authorized endpoint to download security documents.
    If the resource is restricted and user is not an admin,
    CloudShield Threat Detection Engine actively intercepts the access under RULE_03 (+45 pts),
    generates an incident ticket, alerts the SOC, adds to threat notifications, and returns 403.
    """
    resource = next((r for r in DOWNLOADABLE_RESOURCES if r["id"] == resource_id), None)
    if not resource:
        raise HTTPException(status_code=404, detail=f"Resource '{resource_id}' not found in library.")

    # Access control enforcement:
    if resource.get("restricted", False) and current_user.role.value != "admin":
        from app.models.schemas import SecurityEventCreate
        from app.routers.events import process_and_ingest_event

        # 1. Pipe unauthorized access into Threat Detection Engine:
        target_path = f"/resources/restricted/{resource['file_name']}"
        event_in = SecurityEventCreate(
            event_type="UNAUTHORIZED_RESOURCE_ACCESS",
            test_user=current_user.email,
            source_ip="192.168.1.100",
            resource=target_path,
            action="unauthorized_file_download_intercept",
            request_count=1,
            raw_payload={
                "status_code": 403,
                "attempted_resource": target_path,
                "attempted_file": resource["file_name"],
                "resource_id": resource["id"],
                "category": resource["category"],
                "required_role": resource.get("required_role", "admin"),
                "user_role": current_user.role.value,
                "detector_intercept": True
            }
        )
        event = process_and_ingest_event(event_in, actor=current_user.email)

        # 2. Dispatch immediate Amazon SNS Security Alert to Admin
        from app.aws.sns_handler import publish_unauthorized_access_alert
        sns_dispatch = publish_unauthorized_access_alert(
            user_email=current_user.email,
            resource_title=resource.get("title", resource["file_name"]),
            resource_path=target_path,
            client_ip="192.168.1.100",
            incident_id=event.incident_id
        )

        # Update incident record with SNS delivery status
        if event.incident_id:
            from app.storage import get_storage
            st = get_storage()
            inc = st.get_incident(event.incident_id)
            if inc:
                inc.notified_via_sns = True
                st.save_incident(inc)

        # 3. Return HTTP 403 with full threat detection metadata
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "ACCESS_INTERCEPTED_BY_DETECTOR",
                "message": f"CloudShield Threat Detector intercepted unauthorized download attempt targeting restricted asset '{resource['title']}'. An urgent alert and Amazon SNS notification have been dispatched to the Administrator.",
                "threat_detected": True,
                "rule_code": "RULE_03",
                "rule_name": "Unauthorized Resource Access",
                "penalty": "+45 pts",
                "risk_score": event.risk_score,
                "severity": event.severity.value,
                "event_id": event.event_id,
                "incident_created": bool(event.incident_id),
                "incident_id": event.incident_id,
                "detection_reasons": event.detection_reasons,
                "target_file": resource["file_name"],
                "required_role": resource.get("required_role", "admin"),
                "user_identity": current_user.email,
                "sns_notified": True,
                "sns_message_id": sns_dispatch.get("message_id")
            }
        )

    # If allowed, deliver the real file
    file_path = os.path.join(STATIC_RESOURCES_DIR, resource["file_name"])
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File '{resource['file_name']}' is not available on storage.")
    
    ext = os.path.splitext(resource["file_name"])[1].lower()
    media_types = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".csv": "text/csv"
    }
    media_type = media_types.get(ext, "application/octet-stream")
    return FileResponse(
        path=file_path,
        filename=resource["file_name"],
        media_type=media_type
    )

# =============================================================================
# Notifications: Automated Threat Warnings & Admin Direct Messages
# =============================================================================
@router.get("/notifications")
async def get_user_notifications(current_user: UserProfile = Depends(get_current_user)):
    """
    Returns personal notification feed containing two clear types:
    1. Automated threat warnings: CloudShield detects activity associated with user's account, applies scoring rules, explains why event was flagged.
    2. Admin notifications: Administrator warnings, corrective instructions, or messages to the user.
    """
    user_email_lower = current_user.email.lower()
    read_set = USER_NOTIFICATION_READ_STATE.get(user_email_lower, set())
    storage = get_storage()
    all_events, _ = storage.list_events(limit=500)
    
    # 1. Automated threat warnings from user's detected events
    user_events = [e for e in all_events if e.test_user.lower() == user_email_lower and e.risk_score > 0]
    
    notifications = []
    
    # Static baseline admin notifications
    admin_notifs = [
        {
            "id": "admin-msg-01",
            "type": "ADMIN_NOTIFICATION",
            "title": "SOC Security Directive: Corporate MFA Protocol",
            "severity": "MEDIUM",
            "timestamp": "2026-03-24T09:00:00Z",
            "reason": "Corporate cybersecurity policy mandates Time-based One-Time Password (TOTP) or hardware FIDO2 key for cloud access.",
            "admin_sender": "Security Operations Center (soc@cloudshield.internal)",
            "recommended_action": "Download the Password & MFA Configuration Guide from the Resources tab and verify your authenticator token.",
            "read": "admin-msg-01" in read_set
        },
        {
            "id": "admin-msg-02",
            "title": "Admin Notice: Scheduled CanIPhish Exercise Underway",
            "severity": "LOW",
            "timestamp": "2026-03-20T11:30:00Z",
            "reason": "Quarterly organizational threat vigilance exercise is currently active to test email phishing detection.",
            "admin_sender": "Threat Intelligence Analyst (admin@cloudshield.internal)",
            "recommended_action": "Inspect email headers and lookalike domains. Use the Mail tab to review campaigns or report suspicious lures.",
            "read": "admin-msg-02" in read_set
        }
    ]
    notifications.extend(admin_notifs)
    
    for e in user_events[:8]:
        notif_id = f"warn-{e.event_id}"
        rule_desc = e.triggered_rules[0] if e.triggered_rules else "Security Heuristic"
        reasons_text = "; ".join(e.detection_reasons) if e.detection_reasons else f"Flagged by CloudShield detection heuristic {rule_desc} with risk score {e.risk_score}."
        
        # Recommended action based on threat type
        rec_action = "Review your recent session activity and avoid navigating to unverified links."
        if "LOGIN" in e.event_type.upper() or "RULE_01" in rule_desc:
            rec_action = "Multiple failed authentication attempts detected. Check if your credentials have been compromised and change your password in Profile."
        elif "RESOURCE" in e.event_type.upper() or "RULE_03" in rule_desc:
            rec_action = "Unauthorized access attempt targeting protected cloud assets was intercepted. Adhere strictly to assigned RBAC permissions."
        elif "BURST" in e.event_type.upper() or "RULE_04" in rule_desc:
            rec_action = "Rapid request frequency flood flagged. Check background API polling and rate limiting configurations."
        elif "COMPROMISED" in e.event_type.upper() or "CANIPH_04" in rule_desc:
            rec_action = "CRITICAL: Credentials submitted on simulated phishing landing page. Change your Active Directory password immediately."
        elif "CLICKED" in e.event_type.upper() or "CANIPH_02" in rule_desc:
            rec_action = "Deceptive link was clicked. Download the Phishing Awareness Checklist in Resources and inspect destination URLs."
            
        notifications.append({
            "id": notif_id,
            "type": "AUTOMATED_THREAT_WARNING",
            "title": f"Automated Threat Warning: {e.event_type.replace('_', ' ').title()}",
            "severity": e.severity.value if hasattr(e.severity, "value") else str(e.severity),
            "timestamp": e.timestamp,
            "reason": reasons_text,
            "rule_code": rule_desc,
            "risk_score": e.risk_score,
            "incident_id": e.incident_id,
            "recommended_action": rec_action,
            "read": notif_id in read_set
        })
        
    return notifications

@router.post("/notifications/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    """Marks a single notification as read."""
    user_email_lower = current_user.email.lower()
    if user_email_lower not in USER_NOTIFICATION_READ_STATE:
        USER_NOTIFICATION_READ_STATE[user_email_lower] = set()
    USER_NOTIFICATION_READ_STATE[user_email_lower].add(notification_id)
    return {"status": "SUCCESS", "notification_id": notification_id, "read": True}

@router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(
    current_user: UserProfile = Depends(get_current_user)
):
    """Marks all notifications as read for the user."""
    user_email_lower = current_user.email.lower()
    notifications = await get_user_notifications(current_user)
    if user_email_lower not in USER_NOTIFICATION_READ_STATE:
        USER_NOTIFICATION_READ_STATE[user_email_lower] = set()
    for n in notifications:
        USER_NOTIFICATION_READ_STATE[user_email_lower].add(n["id"])
    return {"status": "SUCCESS", "marked_count": len(notifications)}

# =============================================================================
# Mail: CanIPhish Integration Email Activity & Delivery Status
# =============================================================================
class ReportPhishRequest(BaseModel):
    campaign_name: str
    campaign_id: Optional[str] = None
    sender_email: Optional[str] = None

@router.get("/mail/activity")
async def get_user_mail_activity(current_user: UserProfile = Depends(get_current_user)):
    """
    Returns CanIPhish-related email activity, simulation messages,
    delivery status, opened/clicked/reported outcomes, event timestamps,
    last-sync time, and integration status.
    """
    now_str = datetime.now(timezone.utc).isoformat()
    _, simulations = get_user_events_and_simulations(current_user.email)
    
    campaigns = [
        {
            "id": "mail-camp-01",
            "campaign_id": "camp-goog-login",
            "campaign_name": "Gmail Login Attempt Blocked Alert",
            "sender_display": "Google Security Notice",
            "sender_email": "no-reply@accounts.google-security-notice.net",
            "lookalike_domain": "accounts.google.alerting-services.com",
            "delivery_status": "DELIVERED",
            "outcome": "DELIVERED",
            "timestamp": "2026-03-24T08:14:00Z",
            "threat_level": "HIGH",
            "risk_delta": "+15 pts (if opened)",
            "difficulty": "Hard (31% Org Compromise Rate)",
            "feedback": "Lure mimics urgent Google Account security notification with forged lookalike domain 'alerting-services.com'.",
            "subject": "Security Alert: Suspicious sign-in attempt was prevented",
            "can_report": True
        },
        {
            "id": "mail-camp-02",
            "campaign_id": "camp-msft-share",
            "campaign_name": "Microsoft 365 Shared Executive Briefing",
            "sender_display": "Microsoft SharePoint Cloud",
            "sender_email": "notifications@sharepoint-onedrive-internal.net",
            "lookalike_domain": "login.microsoftonline.alerting-services.com",
            "delivery_status": "DELIVERED",
            "outcome": "CLICKED",
            "timestamp": "2026-03-22T14:20:00Z",
            "threat_level": "HIGH",
            "risk_delta": "+35 pts (RULE CANIPH_02)",
            "difficulty": "Moderate (18% Org Compromise Rate)",
            "feedback": "Link clicked. Deceptive URI redirected to credential harvesting page outside corporate Office 365 tenant.",
            "subject": "OneDrive: Q1 Financial Ledger shared with your account",
            "can_report": False
        },
        {
            "id": "mail-camp-03",
            "campaign_id": "camp-hr-payroll",
            "campaign_name": "Urgent HR Payroll Direct Deposit Verification",
            "sender_display": "Corporate HR Benefits Team",
            "sender_email": "benefits@internal-corporate-payroll.co",
            "lookalike_domain": "payroll.alerting-services.com",
            "delivery_status": "DELIVERED",
            "outcome": "REPORTED",
            "timestamp": "2026-03-19T11:05:00Z",
            "threat_level": "CRITICAL",
            "risk_delta": "-10 pts Awareness Reward (CANIPH_05)",
            "difficulty": "Hard (27% Org Compromise Rate)",
            "feedback": "Vigilant action: Email was reported to SOC within 4 minutes. Positive awareness credit awarded.",
            "subject": "Action Required: Confirm your direct deposit bank account details",
            "can_report": False
        },
        {
            "id": "mail-camp-04",
            "campaign_id": "camp-link-inmail",
            "campaign_name": "LinkedIn InMail: Confidential Executive Opportunity",
            "sender_display": "LinkedIn Talent Executive",
            "sender_email": "inmail-messages@linkedin-talent-network.com",
            "lookalike_domain": "identity.alerting-services.com",
            "delivery_status": "DELIVERED",
            "outcome": "COMPROMISED",
            "timestamp": "2026-03-15T16:45:00Z",
            "threat_level": "CRITICAL",
            "risk_delta": "+70 pts (CANIPH_04)",
            "difficulty": "Hard (38% Org Compromise Rate)",
            "feedback": "Compromise detected: User credentials submitted on spoofed LinkedIn login page. SOC incident generated.",
            "subject": "New message from Executive Recruiter regarding VP Engineering Role",
            "can_report": False
        },
        {
            "id": "mail-camp-05",
            "campaign_id": "camp-vpn-2fa",
            "campaign_name": "Corporate Pulse VPN Urgent 2FA Configuration",
            "sender_display": "Enterprise IT Helpdesk",
            "sender_email": "helpdesk@corporate-pulsevpn-auth.net",
            "lookalike_domain": "vpn.alerting-services.com",
            "delivery_status": "DELIVERED",
            "outcome": "DELIVERED",
            "timestamp": "2026-03-10T09:12:00Z",
            "threat_level": "HIGH",
            "risk_delta": "+15 pts (if opened)",
            "difficulty": "Moderate (22% Org Compromise Rate)",
            "feedback": "Simulated IT maintenance lure. No interactions recorded (safe hygiene).",
            "subject": "IT Notice: Mandatory VPN Certificate Upgrade before Friday",
            "can_report": True
        }
    ]
    
    # Merge any dynamic simulations recorded in storage
    for s in simulations:
        c_name = s.get("campaign_name", "Phishing Campaign")
        existing = next((c for c in campaigns if c["campaign_name"] == c_name), None)
        if existing:
            if s.get("email_reported"):
                existing["outcome"] = "REPORTED"
                existing["can_report"] = False
            elif s.get("employee_compromised"):
                existing["outcome"] = "COMPROMISED"
                existing["can_report"] = False
            elif s.get("link_clicked"):
                existing["outcome"] = "CLICKED"
                existing["can_report"] = False
                
    total_delivered = len(campaigns)
    total_opened = sum(1 for c in campaigns if c["outcome"] in ["OPENED", "CLICKED", "COMPROMISED", "REPORTED"])
    total_clicked = sum(1 for c in campaigns if c["outcome"] in ["CLICKED", "COMPROMISED"])
    total_compromised = sum(1 for c in campaigns if c["outcome"] == "COMPROMISED")
    total_reported = sum(1 for c in campaigns if c["outcome"] == "REPORTED")
    
    return {
        "integration_status": "CONNECTED",
        "provider": "CanIPhish REST API & Ingestion Webhook",
        "last_sync_time": now_str,
        "target_user": current_user.email,
        "total_delivered": total_delivered,
        "total_opened": total_opened,
        "total_clicked": total_clicked,
        "total_compromised": total_compromised,
        "total_reported": total_reported,
        "campaigns": campaigns
    }

@router.post("/mail/report-phish")
async def report_phishing_email_from_mail(
    payload: ReportPhishRequest,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Submits an emailReported event to the CloudShield Threat Detection Engine,
    awarding positive awareness points and notifying the SOC.
    """
    from app.models.schemas import SecurityEventCreate, SourcePlatform
    from app.routers.events import process_and_ingest_event
    
    event_in = SecurityEventCreate(
        source_platform=SourcePlatform.CANIPHISH,
        event_type="emailReported",
        test_user=current_user.email,
        source_ip="192.168.1.55",
        resource="client://portal/mail/report-button",
        action="report",
        campaign_name=payload.campaign_name,
        campaign_id=payload.campaign_id or "camp-user-report",
        raw_payload={
            "reported_by": current_user.email,
            "campaign_name": payload.campaign_name,
            "emailReported": True,
            "action": "report"
        }
    )
    event = process_and_ingest_event(event_in, actor=current_user.email)
    return {
        "status": "REPORTED_TO_SOC",
        "message": f"Successfully reported '{payload.campaign_name}' to SOC. Positive awareness points awarded.",
        "awareness_bonus": "+15 pts",
        "risk_penalty_delta": "-10 pts (CANIPH_05)",
        "event_id": event.event_id
    }

@router.post("/change-password")
async def change_user_password(
    payload: ChangePasswordRequest,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Allows user to update their account password with validation.
    """
    user_record = DEMO_USERS_DB.get(current_user.email)
    if not user_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found")

    if not verify_password(payload.current_password, user_record["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters in length"
        )

    user_record["hashed_password"] = get_password_hash(payload.new_password)

    return {
        "status": "SUCCESS",
        "message": "Password changed successfully"
    }

@router.patch("/preferences")
async def update_user_preferences(
    payload: UserPreferencesRequest,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Updates user personal notification preferences.
    """
    USER_PREFERENCES_STATE[current_user.email] = payload.model_dump()
    return {
        "status": "SUCCESS",
        "message": "Preferences updated successfully",
        "preferences": USER_PREFERENCES_STATE[current_user.email]
    }

# =============================================================================
# Table I: Detection Engine Rules Catalog (10 Detection Heuristics)
# =============================================================================
DETECTION_RULES_CATALOG = [
    {
        "rule_code": "RULE_01",
        "rule_name": "Repeated Failed Login",
        "penalty": "+40 pts",
        "points": 40,
        "sliding_window": "300 seconds",
        "evaluation_condition": "≥ 5 failed authentications for user u",
        "category": "Identity & Authentication Defense",
        "description": "Detector monitors authentication events across a 300s window. Intercepts credential brute-force when ≥ 5 failures occur.",
        "severity": "HIGH",
        "icon": "KeyRound"
    },
    {
        "rule_code": "RULE_02",
        "rule_name": "Unusual IP Perimeter",
        "penalty": "+25 pts",
        "points": 25,
        "sliding_window": "Instantaneous",
        "evaluation_condition": "Origin IP not in corporate whitelist perimeter",
        "category": "Network Perimeter Security",
        "description": "Detector inspects client source IP against the corporate trusted CIDR perimeter. Flags unauthorized foreign addresses.",
        "severity": "LOW",
        "icon": "Globe"
    },
    {
        "rule_code": "RULE_03",
        "rule_name": "Unauthorized Resource",
        "penalty": "+45 pts",
        "points": 45,
        "sliding_window": "Instantaneous",
        "evaluation_condition": "Access targeting IAM credentials or admin secrets",
        "category": "Cloud Asset & IAM Authorization",
        "description": "Detector intercepts attempts by unprivileged users to access sensitive IAM credentials or admin secrets.",
        "severity": "MEDIUM",
        "icon": "Lock"
    },
    {
        "rule_code": "RULE_04",
        "rule_name": "API Request Burst Flood",
        "penalty": "+35 pts",
        "points": 35,
        "sliding_window": "60 seconds",
        "evaluation_condition": "≥ 20 requests originating from single IP",
        "category": "Rate Limiting & DoS Protection",
        "description": "Detector quantizes request volume per IP in a 60s window. Triggers high-frequency anomaly alert when burst ≥ 20 calls.",
        "severity": "MEDIUM",
        "icon": "Zap"
    },
    {
        "rule_code": "RULE_05",
        "rule_name": "Multi-Vector Compound",
        "penalty": "+20 pts",
        "points": 20,
        "sliding_window": "Instantaneous",
        "evaluation_condition": "≥ 2 distinct rules triggered concurrently",
        "category": "Multi-Vector Correlation Defense",
        "description": "Detector applies an automatic +20 points compounding escalation when multiple distinct threat vectors are correlated concurrently.",
        "severity": "CRITICAL",
        "icon": "ShieldAlert"
    },
    {
        "rule_code": "CANIPH_01",
        "rule_name": "Phishing Email Opened",
        "penalty": "+15 pts",
        "points": 15,
        "sliding_window": "Instantaneous",
        "evaluation_condition": "Recipient loaded tracking pixel of lure email",
        "category": "Social Engineering Detection",
        "description": "Detector intercepts telemetry when an employee opens a deceptive lure email and loads the embedded tracking pixel.",
        "severity": "LOW",
        "icon": "Mail"
    },
    {
        "rule_code": "CANIPH_02",
        "rule_name": "Lure Payload Clicked",
        "penalty": "+35 pts",
        "points": 35,
        "sliding_window": "Instantaneous",
        "evaluation_condition": "User clicked hyperlinked bait to lookalike site",
        "category": "Social Engineering Detection",
        "description": "Detector identifies when an employee clicks a deceptive hyperlinked bait leading to a lookalike domain.",
        "severity": "MEDIUM",
        "icon": "ExternalLink"
    },
    {
        "rule_code": "CANIPH_03",
        "rule_name": "Phishing Website Visited",
        "penalty": "+35 pts",
        "points": 35,
        "sliding_window": "Instantaneous",
        "evaluation_condition": "Navigation to deceptive identity harvesting portal",
        "category": "Social Engineering Detection",
        "description": "Detector detects navigation to external cloned phishing websites operating on alerting-services.com.",
        "severity": "MEDIUM",
        "icon": "Eye"
    },
    {
        "rule_code": "CANIPH_04",
        "rule_name": "Employee Compromised",
        "penalty": "+70 pts",
        "points": 70,
        "sliding_window": "Instantaneous",
        "evaluation_condition": "Form submission / credential input on fake portal",
        "category": "Social Engineering Detection",
        "description": "Detector flags critical emergency when an employee enters credentials into a fake identity portal, generating immediate SOC alerts.",
        "severity": "CRITICAL",
        "icon": "AlertTriangle"
    },
    {
        "rule_code": "CANIPH_05",
        "rule_name": "Phish Email Reported",
        "penalty": "-10 pts",
        "points": -10,
        "sliding_window": "Instantaneous",
        "evaluation_condition": "User flagged email via SOC report button (Mitigation)",
        "category": "Social Engineering Detection",
        "description": "Detector records active defense mitigation when an employee flags a suspicious email, awarding positive resilience credits.",
        "severity": "LOW",
        "icon": "ShieldCheck"
    }
]

CORPORATE_RESOURCES = [
    {
        "id": "res-01",
        "name": "Employee Internal Directory",
        "path": "/api/v1/company/directory",
        "type": "General Access",
        "restricted": False,
        "description": "Public corporate contact directory and departmental routing list."
    },
    {
        "id": "res-02",
        "name": "Corporate Benefits & Leave Policy",
        "path": "/api/v1/hr/policies/leave",
        "type": "General Access",
        "restricted": False,
        "description": "Standard HR employee handbook, insurance guidelines, and PTO request forms."
    },
    {
        "id": "res-03",
        "name": "Engineering Architecture Documentation",
        "path": "/api/v1/engineering/wiki/architecture",
        "type": "General Access",
        "restricted": False,
        "description": "Internal developer wiki containing system topology and architecture standards."
    },
    {
        "id": "res-04",
        "name": "Cloud IAM Root Credentials & Keys",
        "path": "/api/v1/iam/credentials",
        "type": "Restricted Asset",
        "restricted": True,
        "target_rule": "RULE_03",
        "description": "Highly restricted cloud credentials asset. Monitored strictly under RULE_03."
    },
    {
        "id": "res-05",
        "name": "Production Database Secrets & Tokens",
        "path": "/admin/secrets",
        "type": "Restricted Asset",
        "restricted": True,
        "target_rule": "RULE_03",
        "description": "Confidential database master credentials and API keys. Monitored strictly under RULE_03."
    },
    {
        "id": "res-06",
        "name": "Financial Wire Transfer Authorization API",
        "path": "/api/v1/finance/wire-transfers",
        "type": "Restricted Asset",
        "restricted": True,
        "target_rule": "RULE_03",
        "description": "Restricted financial operations gateway. Unprivileged access triggers immediate threat detection."
    }
]

class ResourceAccessRequest(BaseModel):
    resource_path: str
    source_ip: Optional[str] = None

class TestDetectionRequest(BaseModel):
    rule_code: str
    custom_ip: Optional[str] = None
    custom_user: Optional[str] = None

@router.get("/detection-rules")
async def get_detection_rules(current_user: UserProfile = Depends(get_current_user)):
    """Returns the complete Table I catalog of 10 detection rules enforced by the detector."""
    return DETECTION_RULES_CATALOG

@router.get("/rules-catalog")
async def get_rules_catalog_compat(current_user: UserProfile = Depends(get_current_user)):
    """Compatibility alias for detection rules catalog."""
    return DETECTION_RULES_CATALOG

@router.get("/corporate-resources")
async def get_corporate_resources(current_user: UserProfile = Depends(get_current_user)):
    """Returns corporate resources for testing detector interception on restricted vs allowed assets."""
    return CORPORATE_RESOURCES

@router.post("/access-resource")
async def access_corporate_resource(
    payload: ResourceAccessRequest,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Simulates a user attempting to access an enterprise resource.
    If the resource is restricted, CloudShield's Threat Detection Engine
    actively DETECTS the unauthorized access attempt under RULE_03 (+45 pts).
    """
    resource_entry = next((r for r in CORPORATE_RESOURCES if r["path"] == payload.resource_path), None)
    client_ip = payload.source_ip or "192.168.1.100"

    # If general access, allow it normally
    if resource_entry and not resource_entry["restricted"]:
        return {
            "status": "ACCESS_GRANTED",
            "message": f"Successfully accessed '{resource_entry['name']}' ({resource_entry['path']}).",
            "resource": resource_entry,
            "detected_as_threat": False,
            "risk_score": 0,
            "severity": "LOW"
        }

    # If RESTRICTED asset, pipe into Threat Detection Engine:
    target_path = resource_entry["path"] if resource_entry else payload.resource_path
    event_in = SecurityEventCreate(
        event_type="UNAUTHORIZED_RESOURCE_ACCESS",
        test_user=current_user.email,
        source_ip=client_ip,
        resource=target_path,
        action="access_denied_forbidden_read",
        request_count=1,
        raw_payload={
            "status_code": 403,
            "attempted_resource": target_path,
            "user_role": current_user.role.value,
            "detector_intercept": True
        }
    event = process_and_ingest_event(event_in, actor=current_user.email)

    # Dispatch immediate Amazon SNS Security Alert to Admin
    from app.aws.sns_handler import publish_unauthorized_access_alert
    sns_dispatch = publish_unauthorized_access_alert(
        user_email=current_user.email,
        resource_title=resource_entry.get("name", target_path) if resource_entry else target_path,
        resource_path=target_path,
        client_ip=client_ip,
        incident_id=event.incident_id
    )

    if event.incident_id:
        from app.storage import get_storage
        st = get_storage()
        inc = st.get_incident(event.incident_id)
        if inc:
            inc.notified_via_sns = True
            st.save_incident(inc)

    return {
        "status": "ACCESS_INTERCEPTED_BY_DETECTOR",
        "message": f"CloudShield Detector intercepted unauthorized access attempt targeting '{target_path}'. An urgent Amazon SNS alert has been dispatched to the Administrator.",
        "detected_as_threat": True,
        "rule_code": "RULE_03",
        "rule_name": "Unauthorized Resource",
        "penalty": "+45 pts",
        "risk_score": event.risk_score,
        "severity": event.severity.value,
        "event_id": event.event_id,
        "incident_created": bool(event.incident_id),
        "incident_id": event.incident_id,
        "detection_reasons": event.detection_reasons,
        "triggered_rules": event.triggered_rules,
        "test_user": current_user.email,
        "resource": target_path,
        "execution_mode": "AWS_PIPELINE" if settings.AWS_MODE else "LOCAL_SIMULATOR",
        "timestamp": event.timestamp
    }

@router.post("/test-detection")
@router.post("/simulate-rule")
async def test_detection_rule(
    payload: TestDetectionRequest,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Feeds a scenario to the Threat Detection Engine and returns the detector's
    live evaluation result for any of the 10 Table I rules.
    """
    rule = next((r for r in DETECTION_RULES_CATALOG if r["rule_code"] == payload.rule_code), None)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown rule code '{payload.rule_code}'. Supported rules: {[r['rule_code'] for r in DETECTION_RULES_CATALOG]}"
        )

    target_user = payload.custom_user or current_user.email
    code = payload.rule_code

    if code == "RULE_01":
        event_in = SecurityEventCreate(
            event_type="LOGIN_FAILURE",
            test_user=target_user,
            source_ip=payload.custom_ip or "198.51.100.45",
            resource="/api/v1/auth/login",
            action="user_login_failed",
            request_count=5,
            raw_payload={"simulated_failures": 5, "rule_test": code}
        )
    elif code == "RULE_02":
        event_in = SecurityEventCreate(
            event_type="UNUSUAL_IP_ACCESS",
            test_user=target_user,
            source_ip=payload.custom_ip or "203.0.113.89",
            resource="/api/v1/dashboard/metrics",
            action="session_establish_from_external_ip",
            request_count=1,
            raw_payload={"source_geo": "Foreign Unknown VPN", "rule_test": code}
        )
    elif code == "RULE_03":
        event_in = SecurityEventCreate(
            event_type="UNAUTHORIZED_RESOURCE_ACCESS",
            test_user=target_user,
            source_ip=payload.custom_ip or "192.168.1.100",
            resource="/api/v1/iam/credentials",
            action="access_denied_forbidden_read",
            request_count=1,
            raw_payload={"status_code": 403, "rule_test": code}
        )
    elif code == "RULE_04":
        event_in = SecurityEventCreate(
            event_type="HIGH_REQUEST_FREQUENCY",
            test_user=target_user,
            source_ip=payload.custom_ip or "198.51.100.120",
            resource="/api/v1/query/telemetry",
            action="rapid_api_poll_spike",
            request_count=25,
            raw_payload={"simulated_request_burst": 25, "rule_test": code}
        )
    elif code == "RULE_05":
        event_in = SecurityEventCreate(
            event_type="COMBINED_SUSPICIOUS_ACTIVITY",
            test_user=target_user,
            source_ip=payload.custom_ip or "185.220.101.5",
            resource="/admin/secrets",
            action="unauthorized_admin_token_harvest",
            request_count=5,
            raw_payload={"simulated_failures": 5, "status_code": 403, "combined_scenario": True, "rule_test": code}
        )
    elif code == "CANIPH_01":
        event_in = SecurityEventCreate(
            source_platform=SourcePlatform.CANIPHISH,
            event_type="emailOpened",
            test_user=target_user,
            source_ip=payload.custom_ip or "192.168.1.55",
            resource="email://inbox/tracking-pixel.png",
            action="email_opened",
            campaign_name="Google Critical Security Alert",
            campaign_id="camp-sim-goog",
            raw_payload={"template_code": "TMPL-GOOG-01", "template": "Google Password Reset Lure", "emailOpened": True}
        )
    elif code == "CANIPH_02":
        event_in = SecurityEventCreate(
            source_platform=SourcePlatform.CANIPHISH,
            event_type="payloadClicked",
            test_user=target_user,
            source_ip=payload.custom_ip or "192.168.1.55",
            resource="https://accounts.google.com.alerting-services.com/login",
            action="payload_clicked",
            campaign_name="Microsoft 365 Shared Document",
            campaign_id="camp-sim-msft",
            raw_payload={"template_code": "TMPL-MSFT-02", "template": "Microsoft 365 Shared Document", "payloadInteraction": True, "phishing_website": "SITE-MSFT-01"}
        )
    elif code == "CANIPH_03":
        event_in = SecurityEventCreate(
            source_platform=SourcePlatform.CANIPHISH,
            event_type="websiteVisited",
            test_user=target_user,
            source_ip=payload.custom_ip or "192.168.1.55",
            resource="https://identity.alerting-services.com/portal",
            action="visit",
            campaign_name="LinkedIn InMail Lure",
            campaign_id="camp-sim-link",
            raw_payload={"site_code": "SITE-LINK-01", "phishing_website": "SITE-LINK-01", "action": "visit"}
        )
    elif code == "CANIPH_04":
        event_in = SecurityEventCreate(
            source_platform=SourcePlatform.CANIPHISH,
            event_type="employeeCompromised",
            test_user=target_user,
            source_ip=payload.custom_ip or "192.168.1.55",
            resource="https://accounts.google.com.alerting-services.com/harvest",
            action="harvest",
            campaign_name="Urgent HR Payroll Direct Deposit",
            campaign_id="camp-sim-hr",
            raw_payload={"template_code": "TMPL-HR-04", "template": "Urgent HR Direct Deposit Update", "employeeCompromised": True, "action": "harvest"}
        )
    elif code == "CANIPH_05":
        event_in = SecurityEventCreate(
            source_platform=SourcePlatform.CANIPHISH,
            event_type="emailReported",
            test_user=target_user,
            source_ip=payload.custom_ip or "192.168.1.55",
            resource="client://report-button",
            action="report",
            campaign_name="Corporate Pulse VPN 2FA",
            campaign_id="camp-sim-vpn",
            raw_payload={"template_code": "TMPL-VPN-05", "emailReported": True, "action": "report"}
        )

    # Process and evaluate through Threat Detection Engine
    event = process_and_ingest_event(event_in, actor=current_user.email)

    return {
        "status": "DETECTOR_EVALUATION_SUCCESS",
        "rule_code": rule["rule_code"],
        "rule_name": rule["rule_name"],
        "category": rule["category"],
        "penalty": rule["penalty"],
        "sliding_window": rule["sliding_window"],
        "evaluation_condition": rule["evaluation_condition"],
        "event_id": event.event_id,
        "detection_result": event.detection_result,
        "risk_score": event.risk_score,
        "severity": event.severity.value,
        "triggered_rules": event.triggered_rules,
        "detection_reasons": event.detection_reasons,
        "incident_created": bool(event.incident_id),
        "incident_id": event.incident_id,
        "test_user": event.test_user,
        "source_ip": event.source_ip,
        "resource": event.resource,
        "action": event.action,
        "execution_mode": "AWS_PIPELINE" if settings.AWS_MODE else "LOCAL_SIMULATOR",
        "timestamp": event.timestamp
    }


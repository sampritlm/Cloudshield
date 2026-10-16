import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, UserProfile, verify_password, get_password_hash, DEMO_USERS_DB
from app.storage import get_storage
from app.models.schemas import SeverityLevel

router = APIRouter(prefix="/api/user/portal", tags=["Normal User Security Portal"])

# In-memory tracking for user training progress & user notification preferences
USER_TRAINING_STATE: Dict[str, Dict[str, Any]] = {}
USER_PREFERENCES_STATE: Dict[str, Dict[str, Any]] = {}

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

    # Calculate deterministic Personal Security-Awareness Score (0 - 100)
    # Starts at 85 baseline.
    # +15 for each reported phish (up to +30)
    # -25 for each clicked link
    base_score = 85
    base_score += min(30, reports * 15)
    base_score -= (clicks * 25)
    awareness_score = max(20, min(100, base_score))

    if awareness_score >= 80:
        risk_category = "LOW"
        risk_category_title = "Cyber Aware / Low Risk"
    elif awareness_score >= 50:
        risk_category = "MEDIUM"
        risk_category_title = "Moderate Vigilance"
    else:
        risk_category = "HIGH"
        risk_category_title = "High Risk / Needs Training Refresher"

    # Training completion
    user_completed_lessons = USER_TRAINING_STATE.get(current_user.email, {}).get("completed_ids", ["les-01", "les-04"])
    training_completion_pct = int((len(user_completed_lessons) / len(INITIAL_LESSONS)) * 100)

    # Activity timeline
    recent_activity = []
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
    _, simulations = get_user_events_and_simulations(current_user.email)
    clicks = sum(1 for s in simulations if s["link_clicked"])
    reports = sum(1 for s in simulations if s["email_reported"])

    base_score = 85 + min(30, reports * 15) - (clicks * 25)
    current_score = max(20, min(100, base_score))
    previous_score = max(20, min(100, current_score - 10 if reports > clicks else current_score + 15))
    score_delta = current_score - previous_score

    reasons = []
    recommendations = []

    if reports > 0:
        reasons.append(f"Successfully identified and reported {reports} simulated phishing attempt(s) to SOC.")
    if clicks > 0:
        reasons.append(f"Recorded {clicks} simulated link interaction(s) during security testing exercises.")
    else:
        reasons.append("Zero unverified credential submissions or malicious link clicks recorded.")

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

@router.get("/notifications")
async def get_user_notifications(current_user: UserProfile = Depends(get_current_user)):
    """
    Returns personal notification feed: simulation results, reminders, and activity history.
    """
    now_str = datetime.now(timezone.utc).isoformat()
    _, simulations = get_user_events_and_simulations(current_user.email)

    notifications = [
        {
            "id": "notif-01",
            "title": "Security Awareness Score Updated",
            "message": "Your score reflects recent simulation participation. Great work identifying security lures!",
            "type": "INFO",
            "timestamp": now_str,
            "read": False
        },
        {
            "id": "notif-02",
            "title": "Assigned Security Refresher: Spotting Deceptive Domains",
            "message": "New 5-minute micro-learning module is available in your Learning & Tips portal.",
            "type": "TRAINING",
            "timestamp": "2026-03-10T09:30:00Z",
            "read": True
        }
    ]

    for idx, s in enumerate(simulations[:3]):
        if s["email_reported"]:
            notifications.append({
                "id": f"notif-sim-{idx}",
                "title": f"Phish Reported: {s['campaign_name']}",
                "message": "SOC verified your submission. Positive awareness credit awarded.",
                "type": "SIMULATION",
                "timestamp": s["received_at"],
                "read": True
            })
        elif s["link_clicked"]:
            notifications.append({
                "id": f"notif-sim-{idx}",
                "title": f"Simulation Notice: {s['campaign_name']}",
                "message": "A simulated phishing link was clicked. We recommend taking the 5-min link inspection lesson.",
                "type": "SECURITY_ALERT",
                "timestamp": s["received_at"],
                "read": False
            })

    return notifications

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

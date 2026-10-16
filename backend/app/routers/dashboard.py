from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from app.models.schemas import (
    DashboardSummary,
    DistributionItem,
    UserProfile
)
from app.storage import get_storage
from app.config import settings
from app.auth import get_current_user, require_analyst_or_admin

router = APIRouter(prefix="/api/dashboard", tags=["Administrator Dashboard"])

@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(current_user: UserProfile = Depends(require_analyst_or_admin)):
    """Provides key security operational indicators and summary metrics."""
    storage = get_storage()
    counts = storage.get_dashboard_counts()

    storage_name = "Amazon DynamoDB (AWS Mode)" if settings.AWS_MODE else "Local SQLite (Local Simulation Mode)"

    return DashboardSummary(
        total_events=counts["total_events"],
        detected_threats=counts["detected_threats"],
        high_risk_incidents=counts["high_risk_incidents"],
        critical_incidents=counts["critical_incidents"],
        open_incidents=counts["open_incidents"],
        resolved_incidents=counts["resolved_incidents"],
        investigating_incidents=counts["investigating_incidents"],
        last_alert_time=counts["last_alert_time"],
        aws_mode=settings.AWS_MODE,
        storage_type=storage_name
    )

@router.get("/activity-timeseries")
async def get_activity_timeseries(current_user: UserProfile = Depends(require_analyst_or_admin)):
    """Returns time-series security event volume and threat counts."""
    storage = get_storage()
    data = storage.get_time_series_data()
    return data

@router.get("/risk-distribution", response_model=List[DistributionItem])
async def get_risk_distribution(current_user: UserProfile = Depends(require_analyst_or_admin)):
    """Returns distribution of events across severity risk tiers."""
    storage = get_storage()
    events, _ = storage.list_events(limit=500)
    
    counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for e in events:
        sev = e.severity.value
        if sev in counts:
            counts[sev] += 1

    color_map = {
        "LOW": "#0284c7",       # Sky blue
        "MEDIUM": "#d97706",    # Amber
        "HIGH": "#ea580c",      # Orange
        "CRITICAL": "#dc2626"   # Crimson red
    }

    return [
        DistributionItem(name=tier, value=cnt, color=color_map.get(tier))
        for tier, cnt in counts.items()
    ]

@router.get("/threat-distribution", response_model=List[DistributionItem])
async def get_threat_distribution(current_user: UserProfile = Depends(require_analyst_or_admin)):
    """Returns breakdown of detected threat categories."""
    storage = get_storage()
    incidents, _ = storage.list_incidents(limit=500)

    category_counts: Dict[str, int] = {}
    for inc in incidents:
        t_type = inc.threat_type
        category_counts[t_type] = category_counts.get(t_type, 0) + 1

    palette = ["#1e3e62", "#2665a5", "#ea580c", "#dc2626", "#d97706", "#4f46e5"]
    result = []
    idx = 0
    for name, val in category_counts.items():
        result.append(
            DistributionItem(
                name=name,
                value=val,
                color=palette[idx % len(palette)]
            )
        )
        idx += 1

    return result

@router.get("/recent-events")
async def get_recent_events(current_user: UserProfile = Depends(require_analyst_or_admin)):
    """Returns recent 10 security events."""
    storage = get_storage()
    events, _ = storage.list_events(limit=10)
    return events

@router.get("/recent-incidents")
async def get_recent_incidents(current_user: UserProfile = Depends(require_analyst_or_admin)):
    """Returns recent 10 security incidents."""
    storage = get_storage()
    incidents, _ = storage.list_incidents(limit=10)
    return incidents

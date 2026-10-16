from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends, status

from app.models.schemas import (
    Incident,
    IncidentStatusUpdate,
    UserProfile
)
from app.storage import get_storage
from app.auth import get_current_user, require_analyst_or_admin

router = APIRouter(prefix="/api/incidents", tags=["Incident Management"])

@router.get("")
async def list_incidents(
    severity: Optional[str] = Query(None, description="Filter by severity: LOW, MEDIUM, HIGH, CRITICAL, ALL"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: OPEN, INVESTIGATING, RESOLVED, ALL"),
    search: Optional[str] = Query(None, description="Search by ID, user, IP, or threat type"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    current_user: UserProfile = Depends(require_analyst_or_admin)
):
    """Retrieves paginated incident records with filtering and search."""
    storage = get_storage()
    offset = (page - 1) * limit
    incidents, total = storage.list_incidents(
        severity=severity,
        status=status_filter,
        search=search,
        limit=limit,
        offset=offset
    )
    return {
        "items": incidents,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit if limit else 1
    }

@router.get("/{incident_id}", response_model=Incident)
async def get_incident_detail(
    incident_id: str,
    current_user: UserProfile = Depends(require_analyst_or_admin)
):
    """Retrieves full details of a security incident including status history."""
    storage = get_storage()
    incident = storage.get_incident(incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Security incident '{incident_id}' not found"
        )
    return incident

@router.patch("/{incident_id}/status", response_model=Incident)
async def update_incident_status(
    incident_id: str,
    payload: IncidentStatusUpdate,
    current_user: UserProfile = Depends(require_analyst_or_admin)
):
    """
    Updates status of an incident (OPEN -> INVESTIGATING -> RESOLVED).
    Persists changes, records updated_by, timestamp, and audit trail note.
    Requires Security Analyst or Administrator permissions.
    """
    storage = get_storage()
    updated = storage.update_incident_status(
        incident_id=incident_id,
        new_status=payload.status,
        updated_by=f"{current_user.name} ({current_user.email})",
        note=payload.note
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found"
        )
    return updated

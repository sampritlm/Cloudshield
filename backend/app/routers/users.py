from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends, status

from app.auth import (
    DEMO_USERS_DB,
    get_current_user,
    require_admin_role,
    UserProfile,
    get_password_hash
)
from app.models.schemas import UserRole
from app.storage import get_storage

router = APIRouter(prefix="/api/users", tags=["User Management & Access Control"])

class UserStatusUpdate(BaseModel):
    status: str  # ACTIVE, SUSPENDED, RESTRICTED
    reason: Optional[str] = None
    duration_minutes: Optional[int] = None

class UserRoleUpdate(BaseModel):
    role: UserRole

class CreateUserRequest(BaseModel):
    name: str
    email: str
    role: UserRole = UserRole.USER
    password: Optional[str] = "User@CloudShield2026!"

@router.get("")
async def list_users(current_user: UserProfile = Depends(require_admin_role)):
    """
    Returns registered users with their current access control status,
    role assignments, and metadata.
    """
    storage = get_storage()
    access_controls = {item["user_identifier"]: item for item in storage.list_user_access_controls()}
    all_events, _ = storage.list_events(limit=500)

    users_list = []
    for email, user in DEMO_USERS_DB.items():
        ac = access_controls.get(email, {})
        u_events = [e for e in all_events if e.test_user.lower() == email.lower() and e.risk_score > 0]
        user_risk = sum(e.risk_score for e in u_events)
        users_list.append({
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"].value if hasattr(user["role"], "value") else str(user["role"]),
            "created_at": user.get("created_at", "2026-01-01T00:00:00Z"),
            "risk_score": user_risk,
            "threat_events_count": len(u_events),
            "status": ac.get("status", "ACTIVE"),
            "status_reason": ac.get("reason"),
            "status_updated_at": ac.get("updated_at"),
            "status_updated_by": ac.get("updated_by")
        })

    return users_list

@router.patch("/{user_id}/status")
async def update_user_status(
    user_id: str,
    payload: UserStatusUpdate,
    current_user: UserProfile = Depends(require_admin_role)
):
    """
    Enables, suspends, or restricts a user account using CloudShield Access Control storage.
    """
    # Find user by ID or email
    target_user = None
    for u in DEMO_USERS_DB.values():
        if u["id"] == user_id or u["email"].lower() == user_id.lower():
            target_user = u
            break

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with identifier '{user_id}' not found"
        )

    storage = get_storage()
    updated_record = storage.set_user_access_status(
        user_identifier=target_user["email"],
        status=payload.status.upper(),
        updated_by=f"{current_user.name} ({current_user.email})",
        reason=payload.reason or f"Updated to {payload.status.upper()} by administrator",
        duration_minutes=payload.duration_minutes
    )

    return {
        "status": "SUCCESS",
        "message": f"User '{target_user['email']}' access status updated to {payload.status.upper()}",
        "access_control": updated_record
    }

@router.patch("/{user_id}/role")
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdate,
    current_user: UserProfile = Depends(require_admin_role)
):
    """
    Reassigns user role between Admin, Analyst, and Normal User.
    """
    target_email = None
    for email, u in DEMO_USERS_DB.items():
        if u["id"] == user_id or email.lower() == user_id.lower():
            target_email = email
            break

    if not target_email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with identifier '{user_id}' not found"
        )

    DEMO_USERS_DB[target_email]["role"] = payload.role

    return {
        "status": "SUCCESS",
        "message": f"Role for '{target_email}' successfully changed to {payload.role.value}",
        "user": {
            "id": DEMO_USERS_DB[target_email]["id"],
            "email": target_email,
            "name": DEMO_USERS_DB[target_email]["name"],
            "role": payload.role.value
        }
    }

@router.post("")
async def create_user(
    payload: CreateUserRequest,
    current_user: UserProfile = Depends(require_admin_role)
):
    """
    Registers a new user in the CloudShield identity catalog.
    """
    email_clean = payload.email.strip().lower()
    if email_clean in DEMO_USERS_DB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{email_clean}' already exists"
        )

    new_id = f"usr-gen-{len(DEMO_USERS_DB) + 1:02d}"
    now_str = datetime.now(timezone.utc).isoformat()
    raw_pwd = payload.password or "User@CloudShield2026!"

    DEMO_USERS_DB[email_clean] = {
        "id": new_id,
        "email": email_clean,
        "name": payload.name.strip(),
        "hashed_password": get_password_hash(raw_pwd),
        "role": payload.role,
        "created_at": now_str
    }

    storage = get_storage()
    storage.set_user_access_status(
        user_identifier=email_clean,
        status="ACTIVE",
        updated_by=f"{current_user.name} ({current_user.email})",
        reason="Initial account creation"
    )

    return {
        "status": "SUCCESS",
        "message": f"User '{email_clean}' created successfully",
        "user": {
            "id": new_id,
            "email": email_clean,
            "name": payload.name.strip(),
            "role": payload.role.value,
            "created_at": now_str,
            "status": "ACTIVE"
        }
    }

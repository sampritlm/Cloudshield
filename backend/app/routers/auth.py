from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from app.auth import (
    DEMO_USERS_DB,
    verify_password,
    create_access_token,
    get_current_user,
    UserProfile
)
from app.models.schemas import UserCredentials, Token, SecurityEventCreate
from app.routers.events import process_and_ingest_event
from app.storage import get_storage
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
async def login_json(credentials: UserCredentials, request: Request):
    """
    Authenticates user with email & password, returning JWT and role profile.
    Pipes authentication failures directly into the Threat Detection Engine
    to correlate RULE_01 (Repeated Failed Login, +40 pts).
    """
    email = credentials.email.strip().lower()
    user = DEMO_USERS_DB.get(email)
    
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        # Capture client IP (handling reverse proxy headers if present)
        client_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "127.0.0.1")
        if "," in client_ip:
            client_ip = client_ip.split(",")[0].strip()

        # Ingest failed authentication into the security monitoring pipeline
        event_in = SecurityEventCreate(
            event_type="LOGIN_FAILURE",
            test_user=email or "unknown@corp.internal",
            source_ip=client_ip,
            resource="/api/auth/login",
            action="user_login_failed",
            request_count=1,
            raw_payload={
                "status": "failed_login",
                "attempted_user": email,
                "endpoint": "/api/auth/login"
            }
        )
        event = process_and_ingest_event(event_in, actor=email or "anonymous")

        # Query recent failures for windowed context
        storage = get_storage()
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=settings.FAILED_LOGIN_WINDOW_SECONDS)
        recent_events = storage.get_recent_events_by_user(email or "unknown@corp.internal", limit=20)
        
        total_failed = 0
        for past in recent_events:
            try:
                p_time = datetime.fromisoformat(past.timestamp.replace("Z", "+00:00"))
                if p_time >= cutoff and ("LOGIN_FAIL" in past.event_type or "fail" in past.action.lower()):
                    total_failed += (past.request_count or 1)
            except Exception:
                pass
        total_failed = max(1, total_failed)

        is_rule_triggered = (
            "RULE_01_FAILED_LOGIN" in event.triggered_rules
            or total_failed >= settings.FAILED_LOGIN_THRESHOLD
        )

        detail_msg = "Invalid credentials. Please verify your email and password."

        headers = {
            "WWW-Authenticate": "Bearer",
            "X-Failed-Attempts": str(total_failed),
            "X-Threshold": str(settings.FAILED_LOGIN_THRESHOLD),
            "X-Window-Seconds": str(settings.FAILED_LOGIN_WINDOW_SECONDS),
            "X-Rule-Triggered": "true" if is_rule_triggered else "false",
            "X-Rule-Code": "RULE_01",
            "X-Rule-Name": "Repeated Failed Login",
            "X-Penalty": "+40 pts",
            "X-Risk-Score": str(event.risk_score),
            "X-Severity": event.severity.value,
            "X-Incident-Id": str(event.incident_id or ""),
            "X-Event-Id": str(event.event_id or "")
        }

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail_msg,
            headers=headers,
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={"sub": user["email"], "role": user["role"].value},
        expires_delta=access_token_expires
    )

    profile = UserProfile(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"]
    )

    return Token(access_token=token, token_type="bearer", user=profile)

@router.post("/token", response_model=Token)
async def login_oauth(form_data: OAuth2PasswordRequestForm = Depends()):
    """OAuth2 compatible form endpoint for Swagger UI."""
    email = form_data.username.strip().lower()
    user = DEMO_USERS_DB.get(email)

    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": user["email"], "role": user["role"].value})
    profile = UserProfile(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"]
    )
    return Token(access_token=token, token_type="bearer", user=profile)

@router.get("/me", response_model=UserProfile)
async def get_my_profile(current_user: UserProfile = Depends(get_current_user)):
    """Returns currently authenticated user profile."""
    return current_user

from pydantic import BaseModel

class FailedLoginBurstRequest(BaseModel):
    email: str

@router.post("/simulate-failed-burst")
async def simulate_failed_login_burst(payload: FailedLoginBurstRequest, request: Request):
    """
    Executes a burst of 5 failed login attempts to immediately demonstrate RULE_01 detection
    right from the login portal.
    """
    email = payload.email.strip().lower() or "test.victim@corp.internal"
    client_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "198.51.100.45")
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()

    event_in = SecurityEventCreate(
        event_type="LOGIN_FAILURE",
        test_user=email,
        source_ip=client_ip,
        resource="/api/auth/login",
        action="user_login_failed",
        request_count=5,
        raw_payload={
            "status": "failed_login",
            "simulated_failures": 5,
            "attempted_user": email,
            "endpoint": "/api/auth/login",
            "rule_code": "RULE_01"
        }
    )
    event = process_and_ingest_event(event_in, actor=email)

    return {
        "status": "RULE_01_TRIGGERED",
        "rule_code": "RULE_01",
        "rule_name": "Repeated Failed Login",
        "penalty": "+40 pts",
        "sliding_window": "300 seconds",
        "evaluation_condition": "≥ 5 failed authentications for user u",
        "failed_attempts": 5,
        "threshold": 5,
        "event_id": event.event_id,
        "risk_score": event.risk_score,
        "severity": event.severity.value,
        "incident_created": bool(event.incident_id),
        "incident_id": event.incident_id,
        "triggered_rules": event.triggered_rules,
        "detection_reasons": event.detection_reasons,
        "target_user": email,
        "source_ip": client_ip,
        "timestamp": event.timestamp
    }


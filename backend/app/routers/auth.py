from datetime import timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.auth import (
    DEMO_USERS_DB,
    verify_password,
    create_access_token,
    get_current_user,
    UserProfile
)
from app.models.schemas import UserCredentials, Token
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
async def login_json(credentials: UserCredentials):
    """
    Authenticates user with email & password, returning JWT and role profile.
    Input validation: rejects empty or invalid email/passwords.
    """
    email = credentials.email.strip().lower()
    user = DEMO_USERS_DB.get(email)
    
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your email and password.",
            headers={"WWW-Authenticate": "Bearer"},
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

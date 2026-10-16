import pytest
from app.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    DEMO_USERS_DB,
    UserProfile
)
from app.models.schemas import UserRole
from jose import jwt
from app.config import settings

def test_password_hashing_and_verification():
    raw_secret = "CollegeTestPassword2026!"
    hashed = get_password_hash(raw_secret)
    assert hashed != raw_secret
    assert verify_password(raw_secret, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_creation_and_payload():
    data = {"sub": "admin@cloudshield.internal", "role": "admin"}
    token = create_access_token(data)
    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert decoded["sub"] == "admin@cloudshield.internal"
    assert decoded["role"] == "admin"
    assert "exp" in decoded

def test_demo_user_roles():
    admin = DEMO_USERS_DB["admin@cloudshield.internal"]
    analyst = DEMO_USERS_DB["analyst@cloudshield.internal"]
    user = DEMO_USERS_DB["user@cloudshield.internal"]

    assert admin["role"] == UserRole.ADMIN
    assert analyst["role"] == UserRole.ANALYST
    assert user["role"] == UserRole.USER

    # Confirm bcrypt hashing of stored credentials
    assert admin["hashed_password"].startswith("$2b$") or admin["hashed_password"].startswith("$2a$")

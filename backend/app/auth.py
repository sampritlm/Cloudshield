import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.config import settings
from app.models.schemas import UserRole, UserProfile, TokenData

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def get_password_hash(password: str) -> str:
    # bcrypt requires bytes, truncate to max 72 bytes for standard compliance
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

# Pre-hashed demo accounts using native bcrypt
DEMO_USERS_DB: Dict[str, dict] = {
    "admin@cloudshield.internal": {
        "id": "usr-admin-01",
        "email": "admin@cloudshield.internal",
        "name": "Alex Vance (Security Admin)",
        "hashed_password": get_password_hash("Admin@CloudShield2026!"),
        "role": UserRole.ADMIN,
        "created_at": "2026-01-01T00:00:00Z"
    },
    "analyst@cloudshield.internal": {
        "id": "usr-analyst-02",
        "email": "analyst@cloudshield.internal",
        "name": "Sarah Chen (SOC Analyst)",
        "hashed_password": get_password_hash("Analyst@CloudShield2026!"),
        "role": UserRole.ANALYST,
        "created_at": "2026-01-02T00:00:00Z"
    },
    "user@cloudshield.internal": {
        "id": "usr-user-03",
        "email": "user@cloudshield.internal",
        "name": "Devin Clark (Cloud Engineer)",
        "hashed_password": get_password_hash("User@CloudShield2026!"),
        "role": UserRole.USER,
        "created_at": "2026-01-03T00:00:00Z"
    },
    "cloudshield-auditor": {
        "id": "usr-auditor-04",
        "email": "cloudshield-auditor",
        "name": "Alex Mercer (IAM Auditor)",
        "hashed_password": get_password_hash("DemoUser@CloudShield2026!"),
        "role": UserRole.ANALYST,
        "created_at": "2026-10-24T00:00:00Z"
    },
    "auditor@cloudshield.internal": {
        "id": "usr-auditor-04b",
        "email": "auditor@cloudshield.internal",
        "name": "Alex Mercer (IAM Auditor)",
        "hashed_password": get_password_hash("DemoUser@CloudShield2026!"),
        "role": UserRole.ANALYST,
        "created_at": "2026-10-24T00:00:00Z"
    },
    "cloudshield-intern": {
        "id": "usr-intern-05",
        "email": "cloudshield-intern",
        "name": "Jamie Lee (IAM Intern)",
        "hashed_password": get_password_hash("DemoUser@CloudShield2026!"),
        "role": UserRole.USER,
        "created_at": "2026-10-24T00:00:00Z"
    },
    "intern@cloudshield.internal": {
        "id": "usr-intern-05b",
        "email": "intern@cloudshield.internal",
        "name": "Jamie Lee (IAM Intern)",
        "hashed_password": get_password_hash("DemoUser@CloudShield2026!"),
        "role": UserRole.USER,
        "created_at": "2026-10-24T00:00:00Z"
    }
}

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserProfile:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate security credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        role_str: str = payload.get("role")
        if email is None or role_str is None:
            raise credentials_exception
        token_data = TokenData(email=email, role=UserRole(role_str))
    except JWTError:
        raise credentials_exception

    user = DEMO_USERS_DB.get(token_data.email)
    if user is None:
        raise credentials_exception
    return UserProfile(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"]
    )

async def require_admin_role(current_user: UserProfile = Depends(get_current_user)) -> UserProfile:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to perform this security operation"
        )
    return current_user

async def require_analyst_or_admin(current_user: UserProfile = Depends(get_current_user)) -> UserProfile:
    if current_user.role not in [UserRole.ADMIN, UserRole.ANALYST]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Security Analyst or Administrator privileges required"
        )
    return current_user

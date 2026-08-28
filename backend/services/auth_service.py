import bcrypt
from sqlalchemy.orm import Session
from models.user import User


def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt. Returns the hash as a UTF-8 string."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if plain_password matches the stored bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def register_user(db: Session, name: str, email: str, password: str) -> User:
    """
    Create and persist a new User.

    Raises ValueError if the email is already taken.
    The caller is responsible for managing the session lifecycle.
    """
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise ValueError("Email already registered")

    user = User(
        name          = name,
        email         = email,
        password_hash = hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login_user(db: Session, email: str, password: str) -> User:
    """
    Authenticate a user by email and password.

    Raises ValueError if credentials are invalid.
    """
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    if user is None or not verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password")
    return user


# ─── JWT token handling ──────────────────────────────────────────────────────

import os
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secret-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24 * 7  # token valid for 7 days

security = HTTPBearer()


def create_access_token(user_id: int) -> str:
    """Create a signed JWT token for the given user id."""
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """
    FastAPI dependency — decodes the JWT from the Authorization header
    and returns the matching User. Raises 401 if invalid.
    """
    from database import SessionLocal

    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    finally:
        db.close()


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    """
    Change a user's password after verifying the current one.

    Raises ValueError if the current password is wrong or the new one is too short.
    """
    if not verify_password(current_password, user.password_hash):
        raise ValueError("Current password is incorrect")
    if len(new_password) < 8:
        raise ValueError("New password must be at least 8 characters")

    user.password_hash = hash_password(new_password)
    db.commit()

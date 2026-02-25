"""Auth helpers: password hashing, JWT creation/decoding, and the get_current_user dependency.

This is the single seam for auth. To swap to Supabase Auth (or any other provider) later:
  1. Replace the body of `get_current_user` to verify a Supabase JWT instead.
  2. Remove `hash_password` / `verify_password` (Supabase owns passwords).
  3. Remove `create_access_token` (Supabase issues tokens).
  4. Nothing else in the codebase needs to change.
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt as _bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import get_settings

_bearer = HTTPBearer()


# ── Password helpers ─────────────────────────────────────────────────
# Use bcrypt directly to avoid passlib/bcrypt version-compatibility issues.

def hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ── JWT helpers ──────────────────────────────────────────────────────

def create_access_token(user_id: UUID) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


# ── FastAPI dependency ───────────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> UUID:
    """Decode Bearer token and return the user's UUID.

    Raises HTTP 401 if the token is missing, expired, or invalid.
    To swap auth providers, replace only this function.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        user_id_str: str | None = payload.get("sub")
        if not user_id_str:
            raise JWTError("missing sub")
        return UUID(user_id_str)
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

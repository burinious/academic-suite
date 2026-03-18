from __future__ import annotations

import base64
import hashlib
import json
import secrets
from datetime import datetime, timedelta, UTC

from fastapi import HTTPException, status

from app.utils.constants import SESSIONS_FILE, USERS_FILE

SESSION_COOKIE_NAME = "adps_session"
SESSION_DURATION_DAYS = 30
PBKDF2_ITERATIONS = 310_000


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _load_users() -> list[dict]:
    return json.loads(USERS_FILE.read_text(encoding="utf-8"))


def _save_users(users: list[dict]) -> None:
    USERS_FILE.write_text(json.dumps(users, indent=2), encoding="utf-8")


def _load_sessions() -> list[dict]:
    return json.loads(SESSIONS_FILE.read_text(encoding="utf-8"))


def _save_sessions(sessions: list[dict]) -> None:
    SESSIONS_FILE.write_text(json.dumps(sessions, indent=2), encoding="utf-8")


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _hash_password(password: str, salt: bytes | None = None) -> dict[str, str]:
    resolved_salt = salt or secrets.token_bytes(16)
    derived_key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        resolved_salt,
        PBKDF2_ITERATIONS,
    )
    return {
        "password_salt": base64.b64encode(resolved_salt).decode("utf-8"),
        "password_hash": base64.b64encode(derived_key).decode("utf-8"),
    }


def _verify_password(password: str, password_salt: str, password_hash: str) -> bool:
    salt = base64.b64decode(password_salt.encode("utf-8"))
    expected = _hash_password(password, salt=salt)
    return secrets.compare_digest(expected["password_hash"], password_hash)


def _clean_expired_sessions(sessions: list[dict]) -> list[dict]:
    now = datetime.now(UTC)
    return [
        session
        for session in sessions
        if datetime.fromisoformat(session["expires_at"]) > now
    ]


def _public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
    }


def has_registered_users() -> bool:
    return bool(_load_users())


def register_user(name: str, email: str, password: str) -> dict:
    users = _load_users()
    normalized_email = _normalize_email(email)

    if any(user["email"] == normalized_email for user in users):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    next_user = {
        "id": secrets.token_hex(12),
        "name": name.strip(),
        "email": normalized_email,
        "created_at": _now_iso(),
        **_hash_password(password),
    }
    users.append(next_user)
    _save_users(users)
    return _public_user(next_user)


def authenticate_user(email: str, password: str) -> dict:
    users = _load_users()
    normalized_email = _normalize_email(email)
    matched_user = next((user for user in users if user["email"] == normalized_email), None)

    if not matched_user or not _verify_password(password, matched_user["password_salt"], matched_user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    return _public_user(matched_user)


def create_session(user_id: str) -> str:
    raw_token = secrets.token_urlsafe(32)
    sessions = _clean_expired_sessions(_load_sessions())
    now = datetime.now(UTC)
    expires_at = now + timedelta(days=SESSION_DURATION_DAYS)

    sessions.append(
        {
            "id": secrets.token_hex(10),
            "user_id": user_id,
            "token_hash": _hash_token(raw_token),
            "created_at": now.isoformat(),
            "last_used_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
        }
    )
    _save_sessions(sessions)
    return raw_token


def try_get_user_by_session_token(token: str | None) -> dict | None:
    if not token:
        return None

    sessions = _clean_expired_sessions(_load_sessions())
    token_hash = _hash_token(token)
    matched_session = next((session for session in sessions if session["token_hash"] == token_hash), None)
    if not matched_session:
        _save_sessions(sessions)
        return None

    users = _load_users()
    matched_user = next((user for user in users if user["id"] == matched_session["user_id"]), None)
    if not matched_user:
        return None

    matched_session["last_used_at"] = _now_iso()
    _save_sessions(sessions)
    return _public_user(matched_user)


def get_user_by_session_token(token: str | None) -> dict:
    matched_user = try_get_user_by_session_token(token)
    if matched_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return matched_user


def clear_session(token: str | None) -> None:
    if not token:
        return

    token_hash = _hash_token(token)
    sessions = [session for session in _clean_expired_sessions(_load_sessions()) if session["token_hash"] != token_hash]
    _save_sessions(sessions)

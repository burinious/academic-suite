from __future__ import annotations

from fastapi import Cookie, Security
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services.auth_service import SESSION_COOKIE_NAME, get_user_by_session_token
from app.services.firebase_auth_service import is_firebase_auth_enabled, verify_firebase_token

bearer_scheme = HTTPBearer(auto_error=False)


def require_authenticated_user(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    bearer_credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
) -> dict:
    if bearer_credentials and is_firebase_auth_enabled():
        firebase_user = verify_firebase_token(bearer_credentials.credentials)
        if firebase_user:
            return firebase_user
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Firebase token.")

    token = session_token or (bearer_credentials.credentials if bearer_credentials else None)
    return get_user_by_session_token(token)

from __future__ import annotations

from fastapi import APIRouter, Cookie, Depends, Response, Security, status
from fastapi.security import HTTPAuthorizationCredentials

from app.api.dependencies.auth import bearer_scheme, require_authenticated_user
from app.models.schemas import (
    AuthLoginRequest,
    AuthSessionResponse,
    AuthSessionStateResponse,
    AuthStatusResponse,
    AuthRegisterRequest,
)
from app.services.auth_service import (
    SESSION_COOKIE_NAME,
    SESSION_DURATION_DAYS,
    authenticate_user,
    clear_session,
    create_session,
    has_registered_users,
    register_user,
    try_get_user_by_session_token,
)
from app.services.firebase_auth_service import is_firebase_auth_enabled, verify_firebase_token

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=SESSION_DURATION_DAYS * 24 * 60 * 60,
        path="/",
    )


@router.get("/status", response_model=AuthStatusResponse)
async def get_auth_status() -> dict:
    firebase_ready = is_firebase_auth_enabled()
    return {
        "has_users": True if firebase_ready else has_registered_users(),
        "auth_provider": "firebase" if firebase_ready else "local",
    }


@router.post("/register", response_model=AuthSessionResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: AuthRegisterRequest, response: Response) -> dict:
    user = register_user(payload.name, payload.email, payload.password)
    _set_session_cookie(response, create_session(user["id"]))
    return {"user": user}


@router.post("/login", response_model=AuthSessionResponse)
async def login(payload: AuthLoginRequest, response: Response) -> dict:
    user = authenticate_user(payload.email, payload.password)
    _set_session_cookie(response, create_session(user["id"]))
    return {"user": user}


@router.get("/me", response_model=AuthSessionStateResponse)
async def me(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    bearer_credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
) -> dict:
    if bearer_credentials and is_firebase_auth_enabled():
        return {"user": verify_firebase_token(bearer_credentials.credentials)}

    token = session_token or (bearer_credentials.credentials if bearer_credentials else None)
    return {"user": try_get_user_by_session_token(token)}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response, session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME)) -> Response:
    clear_session(session_token)
    response.status_code = status.HTTP_204_NO_CONTENT
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
    return response

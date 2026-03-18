from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

import firebase_admin
from firebase_admin import auth, credentials


def _service_account_payload() -> dict[str, str] | None:
    service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "").strip()
    if service_account_path:
        resolved_path = Path(service_account_path)
        if resolved_path.exists():
            return {"path": str(resolved_path)}

    project_id = os.getenv("FIREBASE_PROJECT_ID", "").strip()
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL", "").strip()
    private_key = os.getenv("FIREBASE_PRIVATE_KEY", "").strip()

    if project_id and client_email and private_key:
        return {
            "type": "service_account",
            "project_id": project_id,
            "client_email": client_email,
            "private_key": private_key.replace("\\n", "\n"),
            "token_uri": "https://oauth2.googleapis.com/token",
        }

    return None


def is_firebase_auth_enabled() -> bool:
    return _service_account_payload() is not None


@lru_cache(maxsize=1)
def get_firebase_app():
    payload = _service_account_payload()
    if payload is None:
        return None

    if firebase_admin._apps:
        return firebase_admin.get_app()

    if "path" in payload:
        credential = credentials.Certificate(payload["path"])
    else:
        credential = credentials.Certificate(payload)

    return firebase_admin.initialize_app(credential)


def verify_firebase_token(token: str | None) -> dict | None:
    if not token or not is_firebase_auth_enabled():
        return None

    app = get_firebase_app()
    decoded_token = auth.verify_id_token(token, app=app)

    return {
        "id": decoded_token["uid"],
        "name": decoded_token.get("name") or decoded_token.get("email", "Workspace User").split("@")[0],
        "email": decoded_token.get("email", ""),
    }

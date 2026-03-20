from __future__ import annotations

import os
from pathlib import Path


def _read_env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def get_bool(name: str, default: bool = False) -> bool:
    value = _read_env(name)
    if not value:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def get_list(name: str) -> list[str]:
    value = _read_env(name)
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def get_storage_dir() -> Path:
    configured_path = _read_env("APP_STORAGE_DIR")
    if configured_path:
        return Path(configured_path).expanduser().resolve()
    return Path(__file__).resolve().parents[2] / "storage"


def get_cors_allowed_origins() -> list[str]:
    return get_list("CORS_ALLOWED_ORIGINS")


def get_session_cookie_secure() -> bool:
    return get_bool("SESSION_COOKIE_SECURE", default=False)


def get_session_cookie_samesite() -> str:
    value = _read_env("SESSION_COOKIE_SAMESITE", "lax").lower()
    if value in {"lax", "strict", "none"}:
        return value
    return "lax"

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
STORAGE_DIR = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
EXPORTS_DIR = STORAGE_DIR / "exports"
PRESETS_DIR = STORAGE_DIR / "presets"
TEMPLATES_DIR = STORAGE_DIR / "templates"
AUTH_DIR = STORAGE_DIR / "auth"
HISTORY_FILE = STORAGE_DIR / "export_history.json"
USERS_FILE = AUTH_DIR / "users.json"
SESSIONS_FILE = AUTH_DIR / "sessions.json"


def ensure_storage_dirs() -> None:
    for path in (STORAGE_DIR, UPLOADS_DIR, EXPORTS_DIR, PRESETS_DIR, TEMPLATES_DIR, AUTH_DIR):
        path.mkdir(parents=True, exist_ok=True)

    if not HISTORY_FILE.exists():
        HISTORY_FILE.write_text("[]", encoding="utf-8")
    if not USERS_FILE.exists():
        USERS_FILE.write_text("[]", encoding="utf-8")
    if not SESSIONS_FILE.exists():
        SESSIONS_FILE.write_text("[]", encoding="utf-8")

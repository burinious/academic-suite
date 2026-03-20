from __future__ import annotations

import json
import re
from pathlib import Path

from app.data.mock_data import DEFAULT_RULES, DEFAULT_TEMPLATES
from app.utils.constants import PRESETS_DIR, TEMPLATES_DIR


def _safe_name(name: str) -> str:
    sanitized = re.sub(r'[<>:"/\\|?*\x00-\x1F]', "", name).strip()
    sanitized = re.sub(r"\s+", "_", sanitized)
    return sanitized[:80] or "preset"


def _preset_path(directory: Path, name: str) -> Path:
    return directory / f"{name}.json"


def _merge_named_items(saved: list[dict], fallback: list[dict]) -> list[dict]:
    seen = {item.get("name") for item in saved}
    merged = list(saved)
    merged.extend(item for item in fallback if item.get("name") not in seen)
    return merged


def save_template(name: str, data: dict) -> dict:
    display_name = name.strip() or "Preset"
    path = _preset_path(TEMPLATES_DIR, _safe_name(display_name))
    payload = {"name": display_name, **data}
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return {"name": display_name, "path": str(path)}


def delete_template(name: str) -> dict:
    display_name = name.strip() or "Preset"
    path = _preset_path(TEMPLATES_DIR, _safe_name(display_name))
    if not path.exists():
        raise FileNotFoundError("Template not found.")
    path.unlink()
    return {"name": display_name, "deleted": True}


def list_templates() -> list[dict]:
    saved = []
    for file_path in TEMPLATES_DIR.glob("*.json"):
        payload = json.loads(file_path.read_text(encoding="utf-8"))
        saved.append({"name": payload.get("name", file_path.stem), **payload})
    return _merge_named_items(saved, DEFAULT_TEMPLATES)


def save_rules(name: str, data: dict) -> dict:
    display_name = name.strip() or "Preset"
    path = _preset_path(PRESETS_DIR, _safe_name(display_name))
    payload = {"name": display_name, **data}
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return {"name": display_name, "path": str(path)}


def list_rules() -> list[dict]:
    saved = []
    for file_path in PRESETS_DIR.glob("*.json"):
        payload = json.loads(file_path.read_text(encoding="utf-8"))
        if isinstance(payload, list):
            saved.extend(payload)
        else:
            saved.append({"name": payload.get("name", file_path.stem), **payload})
    return saved or DEFAULT_RULES

from __future__ import annotations

import json
import zipfile
from datetime import datetime
from pathlib import Path
from uuid import uuid4

import pandas as pd

from app.utils.constants import EXPORTS_DIR, HISTORY_FILE


def _load_history() -> list[dict]:
    if not HISTORY_FILE.exists():
        return []
    return json.loads(HISTORY_FILE.read_text(encoding="utf-8"))


def _save_history(history: list[dict]) -> None:
    HISTORY_FILE.write_text(json.dumps(history, indent=2), encoding="utf-8")


def record_export(module_name: str, output_path: Path, status: str = "Completed") -> dict:
    export_id = f"EXP-{uuid4().hex[:8].upper()}"
    entry = {
        "id": export_id,
        "module": module_name,
        "format": output_path.suffix.replace(".", "").upper(),
        "file": output_path.name,
        "status": status,
        "createdAt": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "path": str(output_path),
    }
    history = _load_history()
    history.insert(0, entry)
    _save_history(history)
    return entry


def get_export_history() -> list[dict]:
    return _load_history()


def export_dataframe(df: pd.DataFrame, module_name: str, filename: str, export_format: str = "xlsx") -> dict:
    output_path = EXPORTS_DIR / f"{filename}.{export_format}"
    if export_format == "csv":
        df.to_csv(output_path, index=False)
    else:
        df.to_excel(output_path, index=False, engine="xlsxwriter")
    return record_export(module_name, output_path)


def export_workbook(sheets: dict[str, pd.DataFrame], module_name: str, filename: str) -> dict:
    output_path = EXPORTS_DIR / f"{filename}.xlsx"
    with pd.ExcelWriter(output_path, engine="xlsxwriter") as writer:
        for sheet_name, dataframe in sheets.items():
            dataframe.to_excel(writer, index=False, sheet_name=sheet_name[:31] or "Sheet1")
    return record_export(module_name, output_path)


def export_zip(file_paths: list[Path], module_name: str, filename: str) -> dict:
    output_path = EXPORTS_DIR / f"{filename}.zip"
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for file_path in file_paths:
            archive.write(file_path, arcname=file_path.name)
    return record_export(module_name, output_path)


def resolve_export_path(export_id: str) -> Path:
    for item in get_export_history():
        if item["id"] == export_id:
            return Path(item["path"])
    raise FileNotFoundError("Export not found.")

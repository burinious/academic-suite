from __future__ import annotations

import csv
import json
import zipfile
from datetime import datetime
from pathlib import Path
from uuid import uuid4

import pandas as pd

from app.models.schemas import ExportTextRowDefinition
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


def export_dataframe(
    df: pd.DataFrame,
    module_name: str,
    filename: str,
    export_format: str = "xlsx",
    top_rows: list[ExportTextRowDefinition | dict | str] | None = None,
    bottom_rows: list[ExportTextRowDefinition | dict | str] | None = None,
) -> dict:
    output_path = EXPORTS_DIR / f"{filename}.{export_format}"
    top_rows = _clean_text_rows(top_rows)
    bottom_rows = _clean_text_rows(bottom_rows)

    if export_format == "csv":
        _write_csv_with_text_rows(output_path, df, top_rows=top_rows, bottom_rows=bottom_rows)
    else:
        _write_xlsx_sheet(output_path, {"Sheet1": {"dataframe": df, "top_rows": top_rows, "bottom_rows": bottom_rows}})
    return record_export(module_name, output_path)


def export_workbook(sheets: dict[str, pd.DataFrame | dict], module_name: str, filename: str) -> dict:
    output_path = EXPORTS_DIR / f"{filename}.xlsx"
    _write_xlsx_sheet(output_path, sheets)
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


def _write_csv_with_text_rows(
    output_path: Path,
    df: pd.DataFrame,
    top_rows: list[ExportTextRowDefinition | dict | str] | None = None,
    bottom_rows: list[ExportTextRowDefinition | dict | str] | None = None,
) -> None:
    top_rows = _clean_text_rows(top_rows)
    bottom_rows = _clean_text_rows(bottom_rows)

    with output_path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.writer(handle)
        for row in top_rows:
            if row["is_blank"]:
                writer.writerow([""])
                continue
            writer.writerow([row["text"]])

        writer.writerow(df.columns.tolist())
        for values in df.itertuples(index=False, name=None):
            writer.writerow(list(values))

        for row in bottom_rows:
            if row["is_blank"]:
                writer.writerow([""])
                continue
            writer.writerow([row["text"]])


def _write_xlsx_sheet(output_path: Path, sheets: dict[str, pd.DataFrame | dict]) -> None:
    with pd.ExcelWriter(output_path, engine="xlsxwriter") as writer:
        workbook = writer.book
        header_format = workbook.add_format({"bold": True, "bg_color": "#E2E8F0", "border": 1})
        note_left_format = workbook.add_format({"bold": True, "align": "left", "valign": "vcenter"})
        note_center_format = workbook.add_format({"bold": True, "align": "center", "valign": "vcenter"})

        for raw_sheet_name, payload in sheets.items():
            sheet_name = raw_sheet_name[:31] or "Sheet1"
            dataframe, top_rows, bottom_rows = _normalize_sheet_payload(payload)
            dataframe.to_excel(writer, index=False, sheet_name=sheet_name, startrow=len(top_rows))

            worksheet = writer.sheets[sheet_name]
            last_column_index = max(len(dataframe.columns) - 1, 0)
            for row_index, value in enumerate(top_rows):
                _write_text_row(
                    worksheet,
                    row_index,
                    value,
                    last_column_index,
                    note_left_format,
                    note_center_format,
                )

            header_row_index = len(top_rows)
            for column_index, column_name in enumerate(dataframe.columns):
                worksheet.write(header_row_index, column_index, column_name, header_format)

            footer_start = header_row_index + len(dataframe.index) + 1
            for offset, value in enumerate(bottom_rows):
                _write_text_row(
                    worksheet,
                    footer_start + offset,
                    value,
                    last_column_index,
                    note_left_format,
                    note_center_format,
                )

            worksheet.set_column(0, last_column_index, 22)


def _normalize_sheet_payload(
    payload: pd.DataFrame | dict,
) -> tuple[pd.DataFrame, list[dict[str, str | bool]], list[dict[str, str | bool]]]:
    if isinstance(payload, pd.DataFrame):
        return payload, [], []

    return (
        payload["dataframe"],
        _clean_text_rows(payload.get("top_rows")),
        _clean_text_rows(payload.get("bottom_rows")),
    )


def _clean_text_rows(rows: list[ExportTextRowDefinition | dict | str] | None) -> list[dict[str, str | bool]]:
    cleaned_rows: list[dict[str, str | bool]] = []

    for row in rows or []:
        normalized = _normalize_text_row(row)
        if normalized is None:
            continue
        cleaned_rows.append(normalized)

    return cleaned_rows


def _normalize_text_row(row: ExportTextRowDefinition | dict | str) -> dict[str, str | bool] | None:
    if isinstance(row, ExportTextRowDefinition):
        payload = row.model_dump()
    elif isinstance(row, dict):
        payload = dict(row)
    else:
        payload = {"text": str(row), "is_blank": False, "merge_across": False, "alignment": "left"}

    text = str(payload.get("text", ""))
    is_blank = bool(payload.get("is_blank", False))
    merge_across = bool(payload.get("merge_across", False))
    alignment = "center" if payload.get("alignment") == "center" else "left"

    if not is_blank and not text.strip():
        return None

    return {
        "text": text if not is_blank else "",
        "is_blank": is_blank,
        "merge_across": merge_across,
        "alignment": alignment,
    }


def _write_text_row(
    worksheet,
    row_index: int,
    row: dict[str, str | bool],
    last_column_index: int,
    note_left_format,
    note_center_format,
) -> None:
    if row["is_blank"]:
        return

    text = str(row["text"])
    format_to_use = note_center_format if row["alignment"] == "center" else note_left_format
    should_merge = bool(row["merge_across"]) and last_column_index > 0

    if should_merge:
        worksheet.merge_range(row_index, 0, row_index, last_column_index, text, format_to_use)
        return

    worksheet.write(row_index, 0, text, format_to_use)

from __future__ import annotations

from app.services.file_ingestion import list_sheets, read_dataframe, read_raw_dataframe
from app.utils.dataframe_utils import frame_to_preview, normalize_headers


def get_sheet_list(file_id: str) -> list[str]:
    return list_sheets(file_id)


def get_preview(file_id: str, sheet_name: str | None = None, limit: int = 25) -> dict:
    raw_df = read_raw_dataframe(file_id, sheet_name=sheet_name)
    normalized_columns = normalize_headers(raw_df.columns)
    df = raw_df.copy()
    df.columns = normalized_columns
    return {
        "file_id": file_id,
        "sheet_name": sheet_name,
        "columns": df.columns.tolist(),
        "rows": frame_to_preview(df, limit=limit),
        "total_rows": len(df.index),
        "header_analysis": [
            {
                "original": str(original),
                "normalized": normalized,
                "changed": str(original) != normalized,
            }
            for original, normalized in zip(raw_df.columns, normalized_columns)
        ],
    }

from __future__ import annotations

import json

from pydantic import TypeAdapter

from app.services.file_ingestion import list_sheets, read_raw_dataframe, resolve_header_row
from app.services.splitter_service import apply_splitter_filters
from app.utils.dataframe_utils import normalize_headers
from app.models.schemas import SplitterFilter


def get_sheet_list(file_id: str) -> list[str]:
    return list_sheets(file_id)


def get_preview(
    file_id: str,
    sheet_name: str | None = None,
    limit: int = 25,
    header_row: int | None = None,
    offset: int = 0,
    filters_json: str | None = None,
    sort_by: str | None = None,
    sort_direction: str = "asc",
) -> dict:
    resolved_header_row = resolve_header_row(file_id, sheet_name=sheet_name) if header_row is None else max(int(header_row), 0)
    raw_df = read_raw_dataframe(file_id, sheet_name=sheet_name, header_row=resolved_header_row)
    normalized_columns = normalize_headers(raw_df.columns)
    df = raw_df.copy()
    df.columns = normalized_columns
    filters = _parse_filters(filters_json)
    if filters:
        df = apply_splitter_filters(df, filters)
    if sort_by:
        normalized_sort = normalize_headers([sort_by])[0]
        if normalized_sort in df.columns:
            df = (
                df.assign(__sort_key=df[normalized_sort].fillna("").astype(str).str.casefold())
                .sort_values(by="__sort_key", ascending=sort_direction != "desc", kind="mergesort")
                .drop(columns="__sort_key")
            )

    safe_offset = max(int(offset), 0)
    safe_limit = max(int(limit), 1)
    preview_frame = df.iloc[safe_offset : safe_offset + safe_limit].fillna("")
    rows = [
        {
            "__row_id": int(row_index),
            **row.to_dict(),
        }
        for row_index, row in preview_frame.iterrows()
    ]
    return {
        "file_id": file_id,
        "sheet_name": sheet_name,
        "resolved_header_row": resolved_header_row,
        "columns": df.columns.tolist(),
        "rows": rows,
        "total_rows": len(df.index),
        "offset": safe_offset,
        "limit": safe_limit,
        "returned_rows": len(rows),
        "has_more": safe_offset + len(rows) < len(df.index),
        "header_analysis": [
            {
                "original": str(original),
                "normalized": normalized,
                "changed": str(original) != normalized,
            }
            for original, normalized in zip(raw_df.columns, normalized_columns)
        ],
    }


def _parse_filters(filters_json: str | None) -> list[SplitterFilter]:
    if not filters_json:
        return []

    payload = json.loads(filters_json)
    adapter = TypeAdapter(list[SplitterFilter])
    return adapter.validate_python(payload)

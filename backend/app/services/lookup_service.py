from __future__ import annotations

import pandas as pd
from fastapi import HTTPException

from app.models.schemas import LookupFillRequest
from app.services.export_service import export_workbook
from app.utils.dataframe_utils import normalize_header
from app.services.file_ingestion import read_dataframe


def run_lookup_fill(request: LookupFillRequest) -> dict:
    primary_df = read_dataframe(request.primary_file_id, sheet_name=request.primary_sheet_name)
    lookup_df = read_dataframe(request.lookup_file_id, sheet_name=request.lookup_sheet_name)

    primary_key = normalize_header(request.primary_key)
    lookup_key = normalize_header(request.lookup_key)
    if primary_key not in primary_df.columns:
        raise HTTPException(status_code=400, detail=f"Primary key '{request.primary_key}' was not found in the main dataset.")
    if lookup_key not in lookup_df.columns:
        raise HTTPException(status_code=400, detail=f"Lookup key '{request.lookup_key}' was not found in the second dataset.")

    mappings = [mapping for mapping in request.mappings if mapping.source.strip() and mapping.target.strip()]
    if not mappings:
        raise HTTPException(status_code=400, detail="Add at least one fill mapping before running VLOOKUP Fill.")

    primary = primary_df.copy()
    lookup = lookup_df.copy()
    primary["__lookup_key"] = _normalize_lookup_key_series(primary[primary_key])
    lookup["__lookup_key"] = _normalize_lookup_key_series(lookup[lookup_key])

    non_blank_lookup = lookup.loc[lookup["__lookup_key"] != ""].copy()
    duplicate_lookup_rows = non_blank_lookup.loc[non_blank_lookup["__lookup_key"].duplicated(keep=False)].copy()
    lookup_unique = non_blank_lookup.drop_duplicates(subset="__lookup_key", keep="first").set_index("__lookup_key", drop=False)

    matched_mask = primary["__lookup_key"].isin(lookup_unique.index)
    filled_columns = 0

    for mapping in mappings:
        source_column = normalize_header(mapping.source)
        if source_column not in lookup.columns:
            raise HTTPException(status_code=400, detail=f"Lookup column '{mapping.source}' was not found in the second dataset.")

        mapped_values = primary["__lookup_key"].map(lookup_unique[source_column])
        target_column = mapping.target.strip()
        if target_column in primary.columns and mapping.mode == "fill_blank":
            existing_values = primary[target_column]
            blank_mask = existing_values.isna() | existing_values.astype(str).str.strip().eq("")
            primary[target_column] = existing_values.where(~blank_mask, mapped_values)
        else:
            primary[target_column] = mapped_values

        filled_columns += 1

    result_df = primary.drop(columns=["__lookup_key"])
    unmatched_rows = result_df.loc[~matched_mask].copy()
    audit = [
        {"metric": "main_rows", "value": int(len(result_df.index))},
        {"metric": "matched_rows", "value": int(matched_mask.sum())},
        {"metric": "unmatched_rows", "value": int((~matched_mask).sum())},
        {"metric": "lookup_duplicates", "value": int(len(duplicate_lookup_rows.index))},
        {"metric": "filled_columns", "value": filled_columns},
    ]

    sheets: dict[str, pd.DataFrame] = {
        "filled_output": result_df,
        "audit": pd.DataFrame(audit),
    }
    if len(unmatched_rows.index):
        sheets["unmatched_rows"] = unmatched_rows
    if len(duplicate_lookup_rows.index):
        sheets["lookup_duplicates"] = duplicate_lookup_rows.drop(columns=["__lookup_key"])

    export = export_workbook(sheets, "VLOOKUP Fill", request.output_name.strip() or "lookup_fill_output")
    preview = result_df.fillna("").head(20).to_dict(orient="records")

    return {
        "job": export,
        "preview": preview,
        "audit": audit,
    }


def _normalize_lookup_key_series(series: pd.Series) -> pd.Series:
    normalized = series.fillna("").astype(str).str.strip().str.replace(r"\.0+$", "", regex=True)
    return normalized.str.casefold()

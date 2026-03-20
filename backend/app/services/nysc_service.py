from __future__ import annotations

import pandas as pd
from fastapi import HTTPException

from app.models.schemas import NYSCSorterRequest
from app.services.export_service import export_workbook
from app.services.file_ingestion import extract_docx_spec_details, extract_template_fields, read_dataframe
from app.services.mapping_service import apply_column_mapping
from app.utils.dataframe_utils import normalize_header


def run_nysc_sorter(request: NYSCSorterRequest) -> dict:
    if not request.source_file_ids:
        raise HTTPException(status_code=400, detail="Upload at least one source workbook or CSV file.")

    frames = []
    source_stats = []
    unique_key = normalize_header(request.unique_key)
    for file_id in request.source_file_ids:
        source_sheet_name = request.source_sheet_names.get(file_id) or request.sheet_name
        frame = read_dataframe(file_id, source_sheet_name)
        if unique_key not in frame.columns:
            raise HTTPException(status_code=400, detail=f"Unique key '{unique_key}' was not found in one of the source files.")

        prepared = _prepare_source_frame(frame, unique_key)
        frames.append(prepared)
        source_stats.append(
            {
                "file_id": file_id,
                "sheet_name": source_sheet_name or "csv_data",
                "rows": len(prepared),
                "columns": len(prepared.columns),
            }
        )

    combined = _merge_source_frames(frames, unique_key)
    if request.spec_file_id:
        combined = _merge_docx_spec_records(combined, request.spec_file_id, unique_key)

    if request.template_file_id:
        target_columns = extract_template_fields(request.template_file_id, request.template_sheet_name or request.sheet_name)
    else:
        target_columns = request.target_fields

    if not target_columns:
        target_columns = [mapping.target for mapping in request.mappings] or combined.columns.tolist()

    mapped = apply_column_mapping(combined, request.mappings)
    if mapped.empty:
        mapped = combined.copy()

    output = pd.DataFrame({column: mapped[column] if column in mapped.columns else "" for column in target_columns})
    unmatched = combined[combined[unique_key].isna() | (combined[unique_key].astype(str).str.strip() == "")]
    matched = combined[~combined.index.isin(unmatched.index)]
    audit = pd.DataFrame(
        [
            {"metric": "total_merged_records", "value": len(combined)},
            {"metric": "matched_records", "value": len(matched)},
            {"metric": "unmatched_records", "value": len(unmatched)},
            {"metric": "mapped_fields", "value": len(request.mappings)},
            {"metric": "target_fields", "value": len(target_columns)},
            {"metric": "source_files", "value": len(request.source_file_ids)},
        ]
    )
    source_audit = pd.DataFrame(source_stats)

    export = export_workbook(
        {
            "completed_output": output,
            "matched_records": matched,
            "unmatched_records": unmatched,
            "audit_report": audit,
            "source_audit": source_audit,
        },
        "Record Sorter",
        request.output_name,
    )

    return {
        "job": export,
        "preview": output.head(25).fillna("").to_dict(orient="records"),
        "audit": audit.to_dict(orient="records"),
        "target_fields": target_columns,
        "source_columns": combined.columns.tolist(),
    }


def _prepare_source_frame(df: pd.DataFrame, unique_key: str) -> pd.DataFrame:
    prepared = df.copy()
    resolved_key = _resolve_join_key(prepared.columns.tolist(), unique_key)
    prepared[resolved_key] = prepared[resolved_key].fillna("").astype(str).str.strip()
    if resolved_key != unique_key:
        prepared[unique_key] = prepared[resolved_key]
    prepared = prepared.drop_duplicates(subset=[unique_key], keep="first")
    prepared = prepared.reset_index(drop=True)
    return prepared


def _merge_source_frames(frames: list[pd.DataFrame], unique_key: str) -> pd.DataFrame:
    merged = frames[0].copy()

    for index, frame in enumerate(frames[1:], start=2):
        suffix = f"__src{index}"
        next_frame = frame.copy()
        overlapping_columns = [column for column in next_frame.columns if column != unique_key and column in merged.columns]
        merged = merged.merge(next_frame, on=unique_key, how="outer", suffixes=("", suffix))

        for column in overlapping_columns:
            extra_column = f"{column}{suffix}"
            if extra_column not in merged.columns:
                continue

            primary = merged[column].replace("", pd.NA)
            extra = merged[extra_column].replace("", pd.NA)
            merged[column] = primary.combine_first(extra).fillna("")
            merged = merged.drop(columns=[extra_column])

    return merged.fillna("").reset_index(drop=True)


def _merge_docx_spec_records(source_df: pd.DataFrame, spec_file_id: str, unique_key: str) -> pd.DataFrame:
    details = extract_docx_spec_details(spec_file_id)
    if not details["records"]:
        return source_df

    spec_df = pd.DataFrame(details["records"]).fillna("")
    spec_key = _resolve_join_key(spec_df.columns.tolist(), unique_key)
    spec_df[spec_key] = spec_df[spec_key].fillna("").astype(str).str.strip()
    if spec_key != unique_key:
        spec_df[unique_key] = spec_df[spec_key]

    source_prepared = source_df.copy()
    source_prepared[unique_key] = source_prepared[unique_key].fillna("").astype(str).str.strip()
    merged = spec_df.merge(source_prepared, on=unique_key, how="left", suffixes=("", "__source"))

    overlapping_columns = [column for column in spec_df.columns if column != unique_key and f"{column}__source" in merged.columns]
    for column in overlapping_columns:
        source_column = f"{column}__source"
        docx_values = merged[column].replace("", pd.NA)
        source_values = merged[source_column].replace("", pd.NA)
        merged[column] = docx_values.combine_first(source_values).fillna("")
        merged = merged.drop(columns=[source_column])

    return merged.fillna("").reset_index(drop=True)


def _resolve_join_key(columns: list[str], requested_key: str) -> str:
    normalized_columns = [normalize_header(column) for column in columns]
    requested = normalize_header(requested_key)
    if requested in normalized_columns:
        return requested

    alias_groups = [
        {"matric_no", "matric_number", "matriculation_number"},
        {"jamb_reg_no", "jamb_reg_number", "jamb_registration_number"},
        {"student_id", "studentid"},
        {"application_number", "application_no", "application_id"},
    ]
    for group in alias_groups:
        if requested in group:
            for column in normalized_columns:
                if column in group:
                    return column

    raise HTTPException(status_code=400, detail=f"Unique key '{requested_key}' was not found in one of the uploaded structures.")

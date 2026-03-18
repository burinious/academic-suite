from __future__ import annotations

import pandas as pd
from fastapi import HTTPException

from app.models.schemas import NYSCSorterRequest
from app.services.export_service import export_workbook
from app.services.file_ingestion import read_dataframe
from app.services.mapping_service import apply_column_mapping


def run_nysc_sorter(request: NYSCSorterRequest) -> dict:
    frames = [read_dataframe(file_id, request.sheet_name) for file_id in request.source_file_ids]
    combined = pd.concat(frames, ignore_index=True).drop_duplicates()
    unique_key = request.unique_key.lower()
    if unique_key not in combined.columns:
        raise HTTPException(status_code=400, detail=f"Unique key '{unique_key}' was not found.")

    combined = combined.drop_duplicates(subset=[unique_key]).reset_index(drop=True)

    if request.template_file_id:
        template_df = read_dataframe(request.template_file_id, request.sheet_name)
        target_columns = template_df.columns.tolist()
    else:
        target_columns = [mapping.target for mapping in request.mappings] or combined.columns.tolist()

    mapped = apply_column_mapping(combined, request.mappings)
    if mapped.empty:
        mapped = combined.copy()

    output = pd.DataFrame({column: mapped[column] if column in mapped.columns else "" for column in target_columns})
    unmatched = combined[combined[unique_key].isna() | (combined[unique_key].astype(str).str.strip() == "")]
    matched = combined[~combined.index.isin(unmatched.index)]
    audit = pd.DataFrame(
        [
            {"metric": "total_source_records", "value": len(combined)},
            {"metric": "matched_records", "value": len(matched)},
            {"metric": "unmatched_records", "value": len(unmatched)},
            {"metric": "mapped_fields", "value": len(request.mappings)},
        ]
    )

    export = export_workbook(
        {
            "completed_output": output,
            "matched_records": matched,
            "unmatched_records": unmatched,
            "audit_report": audit,
        },
        "NYSC Sorter",
        request.output_name,
    )

    return {
        "job": export,
        "preview": output.head(25).fillna("").to_dict(orient="records"),
        "audit": audit.to_dict(orient="records"),
    }

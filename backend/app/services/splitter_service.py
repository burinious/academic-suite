from __future__ import annotations

from datetime import datetime
from pathlib import Path

import pandas as pd
from fastapi import HTTPException

from app.models.schemas import SplitterRequest
from app.services.export_service import export_dataframe, export_workbook, export_zip
from app.services.file_ingestion import read_dataframe


def run_splitter(request: SplitterRequest) -> dict:
    df = read_dataframe(request.file_id, request.sheet_name)
    split_column = request.split_column.lower()
    if split_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Split column '{split_column}' was not found in the dataset.")

    grouped = {
        str(group_name): chunk.reset_index(drop=True)
        for group_name, chunk in df.groupby(split_column, dropna=False)
    }
    summary = (
        df.groupby(split_column, dropna=False)
        .size()
        .reset_index(name="count")
        .rename(columns={split_column: "group"})
    )

    safe_date = datetime.now().strftime("%Y%m%d_%H%M")
    base_name = request.filename_pattern.replace("{date}", safe_date)
    preview = summary.fillna("").to_dict(orient="records")

    if request.export_mode == "separate_sheets":
        sheets = dict(grouped)
        if request.include_summary:
            sheets["summary"] = summary
        export = export_workbook(sheets, "Admission Splitter", base_name.replace("{group}", "all"))
    elif request.export_mode == "separate_files":
        last_export = None
        for group_name, chunk in grouped.items():
            output_name = base_name.replace("{group}", str(group_name))
            last_export = export_dataframe(chunk, "Admission Splitter", output_name, export_format="xlsx")
        export = last_export
    elif request.export_mode == "zipped_files":
        generated_paths = []
        for group_name, chunk in grouped.items():
            output_name = base_name.replace("{group}", str(group_name))
            export_entry = export_dataframe(chunk, "Admission Splitter", output_name, export_format="xlsx")
            generated_paths.append(read_export_path(export_entry))
        export = export_zip(generated_paths, "Admission Splitter", base_name.replace("{group}", "bundle"))
    else:
        raise HTTPException(status_code=400, detail="Unsupported export mode.")

    return {
        "job": export,
        "group_count": len(grouped),
        "summary": preview,
    }


def read_export_path(export_entry: dict) -> Path:
    return Path(export_entry["path"])

from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException

from app.models.schemas import SortMachineRequest
from app.services.export_service import export_dataframe, export_workbook, export_zip
from app.services.file_ingestion import read_dataframe
from app.services.transformation_service import transform_dataset


def run_sort_machine(request: SortMachineRequest) -> dict:
    df = read_dataframe(request.file_id, request.sheet_name)
    transformed = transform_dataset(df, request)
    export_paths: list[Path] = []

    if request.split_column and request.split_export_mode != "none":
        if request.split_column not in transformed.columns:
            raise HTTPException(
                status_code=400,
                detail=f"Split column '{request.split_column}' was not found after header mapping.",
            )

        grouped = {
            str(group_name): chunk.reset_index(drop=True)
            for group_name, chunk in transformed.groupby(request.split_column, dropna=False)
        }

        if request.split_export_mode == "separate_sheets":
            export = export_workbook(grouped, "Sort Machine", "sort_machine_split_output")
        else:
            for group_name, chunk in grouped.items():
                item = export_dataframe(
                    chunk,
                    "Sort Machine",
                    f"sort_machine_{group_name}".replace(" ", "_"),
                    export_format=request.export_format,
                )
                export_paths.append(Path(item["path"]))
            export = export_zip(export_paths, "Sort Machine", "sort_machine_split_bundle")
    else:
        export = export_dataframe(
            transformed,
            "Sort Machine",
            "sort_machine_output",
            export_format=request.export_format,
        )

    return {
        "job": export,
        "preview": transformed.head(25).fillna("").to_dict(orient="records"),
        "row_count": len(transformed),
        "columns": transformed.columns.tolist(),
    }

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from uuid import uuid4

import pandas as pd
from fastapi import HTTPException, UploadFile

from app.data.mock_data import SAMPLE_ADMISSION_ROWS
from app.utils.constants import UPLOADS_DIR
from app.utils.dataframe_utils import normalize_headers


def _metadata_path(file_id: str) -> Path:
    return UPLOADS_DIR / f"{file_id}.json"


def _find_stored_file(file_id: str) -> Path:
    matches = list(UPLOADS_DIR.glob(f"{file_id}.*"))
    file_matches = [match for match in matches if match.suffix != ".json"]
    if not file_matches:
        raise HTTPException(status_code=404, detail="Uploaded file was not found.")
    return file_matches[0]


async def save_upload(file: UploadFile) -> dict:
    suffix = Path(file.filename or "").suffix or ".xlsx"
    file_id = uuid4().hex
    destination = UPLOADS_DIR / f"{file_id}{suffix}"
    content = await file.read()
    destination.write_bytes(content)

    metadata = {
        "file_id": file_id,
        "filename": file.filename or destination.name,
        "content_type": file.content_type,
        "size": len(content),
        "stored_path": str(destination),
        "created_at": datetime.utcnow().isoformat(),
    }
    _metadata_path(file_id).write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


def get_upload_metadata(file_id: str) -> dict:
    meta_path = _metadata_path(file_id)
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="File metadata was not found.")
    return json.loads(meta_path.read_text(encoding="utf-8"))


def read_dataframe(file_id: str, sheet_name: str | None = None) -> pd.DataFrame:
    df = read_raw_dataframe(file_id, sheet_name=sheet_name)
    df.columns = normalize_headers(df.columns)
    return df


def read_raw_dataframe(file_id: str, sheet_name: str | None = None) -> pd.DataFrame:
    file_path = _find_stored_file(file_id)
    suffix = file_path.suffix.lower()

    if suffix == ".csv":
        df = pd.read_csv(file_path)
    elif suffix in {".xlsx", ".xlsm", ".xls"}:
        df = pd.read_excel(file_path, sheet_name=sheet_name or 0)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Use CSV or Excel files.")

    return df


def list_sheets(file_id: str) -> list[str]:
    file_path = _find_stored_file(file_id)
    suffix = file_path.suffix.lower()
    if suffix == ".csv":
        return ["csv_data"]
    if suffix in {".xlsx", ".xlsm", ".xls"}:
        workbook = pd.ExcelFile(file_path)
        return workbook.sheet_names

    raise HTTPException(status_code=400, detail="Unsupported file format.")


def create_mock_upload() -> dict:
    file_id = "sample-academic-dataset"
    csv_path = UPLOADS_DIR / f"{file_id}.csv"
    sample_df = pd.DataFrame(SAMPLE_ADMISSION_ROWS).rename(
        columns={
            "matric_no": "Matric No ",
            "student_name": "Student Name",
            "faculty": "Faculty / School",
            "department": " Department",
            "programme": "Programme Of Study",
            "level": "Current Level",
            "utme_score": "UTME Score",
            "subjects": "Subjects Offered",
            "entry_mode": "Entry Mode",
        }
    )
    sample_df.to_csv(csv_path, index=False)
    _metadata_path(file_id).write_text(
        json.dumps(
            {
                "file_id": file_id,
                "filename": "sample_academic_dataset.csv",
                "content_type": "text/csv",
                "size": csv_path.stat().st_size,
                "stored_path": str(csv_path),
                "created_at": datetime.utcnow().isoformat(),
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    return get_upload_metadata(file_id)

from __future__ import annotations

import csv
import json
import math
import re
import zipfile
from datetime import datetime
from pathlib import Path
from uuid import uuid4
import xml.etree.ElementTree as ET

import pandas as pd
from fastapi import HTTPException, UploadFile

from app.data.mock_data import SAMPLE_ADMISSION_ROWS
from app.utils.constants import UPLOADS_DIR
from app.utils.dataframe_utils import normalize_header, normalize_headers


def _resolve_excel_engine(suffix: str) -> str | None:
    normalized_suffix = suffix.lower()
    if normalized_suffix in {".xlsx", ".xlsm"}:
        return "openpyxl"
    if normalized_suffix == ".xls":
        return "xlrd"
    return None


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


def save_dataframe_as_upload(df: pd.DataFrame, filename: str, suffix: str = ".xlsx") -> dict:
    normalized_suffix = suffix if suffix.startswith(".") else f".{suffix}"
    file_id = uuid4().hex
    destination = UPLOADS_DIR / f"{file_id}{normalized_suffix}"

    safe_name = Path(filename).stem or "cleaned_workspace"
    final_name = f"{safe_name}{normalized_suffix}"
    if normalized_suffix == ".csv":
        df.to_csv(destination, index=False)
        content_type = "text/csv"
    else:
        df.to_excel(destination, index=False)
        content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    metadata = {
        "file_id": file_id,
        "filename": final_name,
        "content_type": content_type,
        "size": destination.stat().st_size,
        "stored_path": str(destination),
        "created_at": datetime.utcnow().isoformat(),
        "preferred_header_row": 0,
    }
    _metadata_path(file_id).write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


def read_dataframe(file_id: str, sheet_name: str | None = None) -> pd.DataFrame:
    df = read_raw_dataframe(file_id, sheet_name=sheet_name)
    df.columns = normalize_headers(df.columns)
    return df


def describe_file_structure(file_id: str, sheet_name: str | None = None) -> dict:
    metadata = get_upload_metadata(file_id)
    file_path = _find_stored_file(file_id)
    suffix = file_path.suffix.lower()

    if suffix in {".csv", ".xlsx", ".xlsm", ".xls"}:
        sheet_label = sheet_name
        if suffix == ".csv":
            sheets = ["csv_data"]
            sheet_label = "csv_data"
        else:
            sheets = list_sheets(file_id)
            sheet_label = sheet_name or (sheets[0] if sheets else None)

        columns = read_dataframe(file_id, sheet_name=sheet_label if suffix != ".csv" else None).columns.tolist()
        return {
            "file_id": file_id,
            "filename": metadata["filename"],
            "file_type": "tabular",
            "sheets": sheets,
            "sheet_name": sheet_label,
            "fields": columns,
            "field_count": len(columns),
        }

    if suffix == ".docx":
        details = extract_docx_spec_details(file_id)
        return {
            "file_id": file_id,
            "filename": metadata["filename"],
            "file_type": "docx_spec",
            "sheets": [],
            "sheet_name": None,
            "fields": details["fields"],
            "field_count": len(details["fields"]),
            "defaults": details["defaults"],
            "record_count": len(details["records"]),
        }

    raise HTTPException(status_code=400, detail="Unsupported file format.")


def resolve_header_row(file_id: str, sheet_name: str | None = None) -> int:
    metadata = get_upload_metadata(file_id)
    if metadata.get("preferred_header_row") is not None:
        return max(int(metadata["preferred_header_row"]), 0)

    file_path = _find_stored_file(file_id)
    suffix = file_path.suffix.lower()
    preview_rows = 12

    if suffix == ".csv":
        rows = []
        with file_path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.reader(handle)
            for _, row in zip(range(preview_rows), reader):
                rows.append(row)
        sample = pd.DataFrame(rows)
    elif suffix in {".xlsx", ".xlsm", ".xls"}:
        sample = pd.read_excel(file_path, sheet_name=sheet_name or 0, header=None, nrows=preview_rows)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Use CSV or Excel files.")

    best_index = 0
    best_score = float("-inf")
    for index in range(len(sample.index)):
        row = sample.iloc[index].tolist()
        score = _score_header_candidate(row)
        if score > best_score:
            best_score = score
            best_index = index

    return int(best_index)


def read_raw_dataframe(file_id: str, sheet_name: str | None = None, header_row: int | None = None) -> pd.DataFrame:
    file_path = _find_stored_file(file_id)
    suffix = file_path.suffix.lower()
    resolved_header = resolve_header_row(file_id, sheet_name=sheet_name) if header_row is None else max(int(header_row), 0)

    try:
        if suffix == ".csv":
            df = pd.read_csv(file_path, header=resolved_header, engine="python")
        elif suffix in {".xlsx", ".xlsm", ".xls"}:
            df = pd.read_excel(
                file_path,
                sheet_name=sheet_name or 0,
                header=resolved_header,
                engine=_resolve_excel_engine(suffix),
            )
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use CSV or Excel files.")
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail="Could not read this workbook. Re-save it as .xlsx or .csv and upload again.",
        ) from error

    return df


def list_sheets(file_id: str) -> list[str]:
    file_path = _find_stored_file(file_id)
    suffix = file_path.suffix.lower()
    if suffix == ".csv":
        return ["csv_data"]
    if suffix in {".xlsx", ".xlsm", ".xls"}:
        try:
            workbook = pd.ExcelFile(file_path, engine=_resolve_excel_engine(suffix))
            return workbook.sheet_names
        except Exception as error:
            raise HTTPException(
                status_code=400,
                detail="Could not inspect workbook sheets. Re-save the file as .xlsx or .csv and upload again.",
            ) from error

    raise HTTPException(status_code=400, detail="Unsupported file format.")


def extract_template_fields(file_id: str, sheet_name: str | None = None) -> list[str]:
    file_path = _find_stored_file(file_id)
    suffix = file_path.suffix.lower()
    if suffix == ".docx":
        return extract_docx_spec_details(file_id)["fields"]
    if suffix in {".csv", ".xlsx", ".xlsm", ".xls"}:
        return read_dataframe(file_id, sheet_name=sheet_name).columns.tolist()

    raise HTTPException(status_code=400, detail="Unsupported template format. Use DOCX, CSV, or Excel.")


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


def extract_docx_spec_details(file_id: str) -> dict:
    file_path = _find_stored_file(file_id)
    blocks = _read_docx_blocks(file_path)
    current_date = ""
    current_programme = ""
    current_class = ""
    records: list[dict[str, str]] = []
    discovered_fields: list[str] = []
    defaults: dict[str, str] = {}

    for block in blocks:
        if block["type"] == "paragraph":
            text = _normalize_docx_text(block["text"])
            if not text:
                continue

            if "date of graduation:" in text.lower():
                current_date = text.split(":", 1)[1].strip()
                if current_date:
                    defaults["date_of_graduation"] = current_date
                continue

            if "programme:" in text.lower():
                current_programme = text.split(":", 1)[1].strip()
                if current_programme:
                    defaults["course_of_study"] = current_programme
                continue

            degree_label = _canonical_degree_label(text)
            if degree_label:
                current_class = degree_label
                defaults["class_of_degree"] = degree_label
                continue

            continue

        table_records, table_fields = _extract_docx_table_records(
            block["rows"],
            current_date=current_date,
            current_programme=current_programme,
            current_class=current_class,
        )
        records.extend(table_records)
        for field in table_fields:
            if field not in discovered_fields:
                discovered_fields.append(field)

    if records:
        for field in records[0].keys():
            if field not in discovered_fields:
                discovered_fields.append(field)

    return {
        "fields": discovered_fields,
        "defaults": defaults,
        "records": records,
    }


def extract_docx_spec_fields(file_id: str) -> list[str]:
    return extract_docx_spec_details(file_id)["fields"]


def _score_header_candidate(values: list[object]) -> float:
    meaningful = []
    alpha_count = 0
    numeric_count = 0

    for value in values:
        if value is None:
            continue
        if isinstance(value, float) and math.isnan(value):
            continue

        text = str(value).strip()
        if not text:
            continue

        meaningful.append(text)
        if any(character.isalpha() for character in text):
            alpha_count += 1
        if text.replace(".", "", 1).isdigit():
            numeric_count += 1

    if not meaningful:
        return float("-inf")

    normalized = [normalize_header(value) for value in meaningful if normalize_header(value)]
    uniqueness = len(set(normalized))
    density_bonus = len(meaningful) * 5
    alpha_bonus = alpha_count * 3
    numeric_penalty = numeric_count * 2

    return density_bonus + alpha_bonus + uniqueness - numeric_penalty


def _split_docx_candidate_text(text: str) -> list[str]:
    for delimiter in ["|", ";", ","]:
        if delimiter in text:
            parts = [segment.strip() for segment in text.split(delimiter)]
            meaningful = [part for part in parts if _clean_docx_candidate(part)]
            if len(meaningful) >= 2:
                return meaningful

    return [text]


def _clean_docx_candidate(value: str) -> str:
    text = str(value or "").strip()
    if not text:
        return ""

    text = text.lstrip("-*•").strip()
    if ". " in text and text.split(". ", 1)[0].isdigit():
        text = text.split(". ", 1)[1].strip()

    if ":" in text and len(text.split(":", 1)[0].split()) > 5:
        text = text.split(":", 1)[1].strip()

    if len(text) > 80:
        return ""

    normalized = normalize_header(text)
    if not normalized:
        return ""

    banned = {
        "requirements",
        "required_documents",
        "senate_list",
        "record_sorter",
        "specification",
        "template",
    }
    if normalized in banned:
        return ""

    return text


def _read_docx_blocks(file_path: Path) -> list[dict]:
    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    try:
        with zipfile.ZipFile(file_path) as archive:
            root = ET.fromstring(archive.read("word/document.xml"))
    except KeyError as error:
        raise HTTPException(status_code=400, detail="Could not read the DOCX document structure.") from error

    body = root.find("w:body", namespace)
    if body is None:
        return []

    blocks = []
    for child in body:
        tag = child.tag.split("}")[-1]
        if tag == "p":
            blocks.append(
                {
                    "type": "paragraph",
                    "text": "".join(node.text or "" for node in child.findall(".//w:t", namespace)),
                }
            )
        elif tag == "tbl":
            rows = []
            for row in child.findall("w:tr", namespace):
                cells = []
                for cell in row.findall("w:tc", namespace):
                    cell_text = "".join(node.text or "" for node in cell.findall(".//w:t", namespace))
                    cells.append(_normalize_docx_text(cell_text))
                rows.append(cells)
            blocks.append({"type": "table", "rows": rows})

    return blocks


def _extract_docx_table_records(
    rows: list[list[str]],
    current_date: str,
    current_programme: str,
    current_class: str,
) -> tuple[list[dict[str, str]], list[str]]:
    meaningful_rows = [[cell.strip() for cell in row] for row in rows if any(str(cell or "").strip() for cell in row)]
    if not meaningful_rows:
        return [], []

    header = [_canonical_docx_header(cell) for cell in meaningful_rows[0]]
    if "matric_no" not in header:
        return [], []

    table_fields = [field for field in header if field]
    for injected_field in ("date_of_graduation", "class_of_degree", "course_of_study"):
        if injected_field not in table_fields:
            table_fields.append(injected_field)

    records = []
    for row in meaningful_rows[1:]:
        padded_row = row + [""] * (len(header) - len(row))
        record = {}
        for column_name, value in zip(header, padded_row):
            if not column_name:
                continue
            record[column_name] = value.strip()

        matric_value = record.get("matric_no", "").strip()
        name_value = record.get("name_of_student", "").strip()
        if not matric_value and not name_value:
            continue
        if matric_value.lower() == "nil" or name_value.lower() == "nil":
            continue

        if current_date:
            record["date_of_graduation"] = current_date
        if current_class:
            record["class_of_degree"] = current_class
        if current_programme:
            record["course_of_study"] = current_programme

        records.append(record)

    return records, table_fields


def _canonical_docx_header(value: str) -> str:
    normalized = normalize_header(value)
    mapping = {
        "s_n": "serial_number",
        "sn": "serial_number",
        "serial_number": "serial_number",
        "matric_no": "matric_no",
        "matric_number": "matric_no",
        "matriculation_number": "matric_no",
        "name_of_student": "name_of_student",
        "student_name": "name_of_student",
        "cgpa": "cgpa",
    }
    return mapping.get(normalized, normalized)


def _canonical_degree_label(value: str) -> str:
    normalized = normalize_header(value)
    mapping = {
        "first_class": "First Class",
        "second_class_upper_division": "Second Class Upper",
        "second_class_lower_division": "Second Class Lower",
        "third_class": "Third Class",
        "pass": "Pass",
    }
    return mapping.get(normalized, "")


def _normalize_docx_text(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("\xa0", " ")).strip()

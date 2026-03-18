from __future__ import annotations

from fastapi import APIRouter, File, Query, UploadFile

from app.models.schemas import PreviewResponse, UploadResponse
from app.services.file_ingestion import create_mock_upload, save_upload
from app.services.preview_service import get_preview, get_sheet_list

router = APIRouter(prefix="/files", tags=["files"])


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)) -> dict:
    return await save_upload(file)


@router.post("/sample", response_model=UploadResponse)
async def upload_sample_file() -> dict:
    return create_mock_upload()


@router.get("/{file_id}/sheets")
async def list_file_sheets(file_id: str) -> dict:
    return {"file_id": file_id, "sheets": get_sheet_list(file_id)}


@router.get("/{file_id}/preview", response_model=PreviewResponse)
async def preview_file(file_id: str, sheet_name: str | None = Query(default=None), limit: int = 25) -> dict:
    return get_preview(file_id, sheet_name=sheet_name, limit=limit)

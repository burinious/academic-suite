from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.services.export_service import get_export_history, resolve_export_path

router = APIRouter(prefix="/exports", tags=["exports"])


@router.get("/history")
async def export_history() -> list[dict]:
    return get_export_history()


@router.get("/{export_id}/download")
async def download_export(export_id: str) -> FileResponse:
    try:
        export_path = resolve_export_path(export_id)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

    return FileResponse(export_path, filename=export_path.name)

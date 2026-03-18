from __future__ import annotations

from fastapi import APIRouter

from app.services.dashboard_service import get_dashboard_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def dashboard_summary() -> dict:
    return get_dashboard_summary()

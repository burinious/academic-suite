from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import PresetPayload
from app.services.preset_service import delete_template, list_rules, list_templates, save_rules, save_template

router = APIRouter(prefix="/presets", tags=["presets"])


@router.get("/templates")
async def get_templates() -> list[dict]:
    return list_templates()


@router.post("/templates")
async def create_template(payload: PresetPayload) -> dict:
    return save_template(payload.name, payload.data)


@router.delete("/templates/{template_name}")
async def remove_template(template_name: str) -> dict:
    try:
        return delete_template(template_name)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.get("/rules")
async def get_rules() -> list[dict]:
    return list_rules()


@router.post("/rules")
async def create_rules(payload: PresetPayload) -> dict:
    return save_rules(payload.name, payload.data)

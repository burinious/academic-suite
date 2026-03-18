from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import (
    AdmissionConfirmationRequest,
    NYSCSorterRequest,
    SortMachineRequest,
    SplitterRequest,
)
from app.services.confirmation_service import run_admission_confirmation
from app.services.nysc_service import run_nysc_sorter
from app.services.sort_machine_service import run_sort_machine
from app.services.splitter_service import run_splitter

router = APIRouter(prefix="/modules", tags=["modules"])


@router.post("/splitter/run")
async def run_splitter_job(payload: SplitterRequest) -> dict:
    return run_splitter(payload)


@router.post("/nysc-sorter/run")
async def run_nysc_sorter_job(payload: NYSCSorterRequest) -> dict:
    return run_nysc_sorter(payload)


@router.post("/admission-confirmation/run")
async def run_confirmation_job(payload: AdmissionConfirmationRequest) -> dict:
    return run_admission_confirmation(payload)


@router.post("/sort-machine/run")
async def run_sort_machine_job(payload: SortMachineRequest) -> dict:
    return run_sort_machine(payload)

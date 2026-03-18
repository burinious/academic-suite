from __future__ import annotations

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.dependencies.auth import require_authenticated_user
from app.api.routes.auth import router as auth_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.exports import router as exports_router
from app.api.routes.files import router as files_router
from app.api.routes.modules import router as modules_router
from app.api.routes.presets import router as presets_router
from app.utils.constants import ensure_storage_dirs

ensure_storage_dirs()

app = FastAPI(
    title="Academic Data Processing Suite API",
    version="0.1.0",
    description="FastAPI backend for academic CSV/XLSX ingestion, validation, transformation, and export workflows.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"https?://(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(files_router, prefix="/api", dependencies=[Depends(require_authenticated_user)])
app.include_router(modules_router, prefix="/api", dependencies=[Depends(require_authenticated_user)])
app.include_router(exports_router, prefix="/api", dependencies=[Depends(require_authenticated_user)])
app.include_router(presets_router, prefix="/api", dependencies=[Depends(require_authenticated_user)])
app.include_router(dashboard_router, prefix="/api", dependencies=[Depends(require_authenticated_user)])


@app.get("/health")
async def health_check() -> dict:
    return {"status": "ok"}

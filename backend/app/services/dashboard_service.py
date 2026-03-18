from __future__ import annotations

from app.data.mock_data import DEFAULT_EXPORT_HISTORY, DEFAULT_TEMPLATES
from app.services.export_service import get_export_history


def _dashboard_module_label(name: str) -> str:
    label_map = {
        "Admission Splitter": "Dataset Splitter",
        "NYSC Sorter": "Record Sorter",
    }
    return label_map.get(name, name)


def get_dashboard_summary() -> dict:
    history = get_export_history() or DEFAULT_EXPORT_HISTORY
    completed_count = len(history)
    warning_count = sum(1 for item in history if item.get("status") == "Warning")

    return {
        "totals": [
            {"label": "Files Processed", "value": 1284 + completed_count, "change": "+18.2%", "tone": "primary"},
            {"label": "Recent Exports", "value": len(history), "change": "+12 today", "tone": "accent"},
            {"label": "Active Templates", "value": len(DEFAULT_TEMPLATES), "change": "3 updated", "tone": "secondary"},
            {"label": "Validation Warnings", "value": 23 + warning_count, "change": "-9 resolved", "tone": "warning"},
        ],
        "chart": [
            {"name": "Mon", "processed": 76, "exports": 34},
            {"name": "Tue", "processed": 98, "exports": 41},
            {"name": "Wed", "processed": 120, "exports": 53},
            {"name": "Thu", "processed": 132, "exports": 61},
            {"name": "Fri", "processed": 154, "exports": 75},
            {"name": "Sat", "processed": 84, "exports": 30},
        ],
        "exports": [{**item, "module": _dashboard_module_label(item.get("module", ""))} for item in history[:3]],
        "warnings": [
            "Three uploads have unrecognized subject columns.",
            "Two mapping profiles are missing department codes.",
            "One rule preset was edited but not published.",
        ],
    }

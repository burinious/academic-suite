from __future__ import annotations

from app.data.mock_data import DEFAULT_RULES
from app.models.schemas import AdmissionConfirmationRequest, RuleDefinition
from app.services.export_service import export_dataframe
from app.services.file_ingestion import read_dataframe
from app.services.rules_engine import evaluate_dataframe


def run_admission_confirmation(request: AdmissionConfirmationRequest) -> dict:
    df = read_dataframe(request.file_id, request.sheet_name)
    rules = request.rules or [RuleDefinition(**rule) for rule in DEFAULT_RULES]
    evaluated = evaluate_dataframe(df, rules)
    export = export_dataframe(evaluated, "Admission Confirmation", "admission_confirmation_report", export_format="xlsx")
    return {
        "job": export,
        "preview": evaluated.head(25).fillna("").to_dict(orient="records"),
        "stats": {
            "qualified": int((evaluated["qualification_status"] == "Qualified").sum()),
            "warnings": int((evaluated["qualification_status"] == "Warning").sum()),
            "not_qualified": int((evaluated["qualification_status"] == "Not Qualified").sum()),
        },
    }

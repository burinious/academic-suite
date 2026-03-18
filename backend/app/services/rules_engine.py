from __future__ import annotations

from typing import Any

import pandas as pd

from app.models.schemas import RuleDefinition


def _coerce_subjects(value: Any) -> set[str]:
    return {item.strip().lower() for item in str(value or "").split(",") if item.strip()}


def _compare(left: Any, operator: str, right: Any) -> bool:
    if operator == ">=":
        return float(left) >= float(right)
    if operator == ">":
        return float(left) > float(right)
    if operator == "<=":
        return float(left) <= float(right)
    if operator == "<":
        return float(left) < float(right)
    if operator == "==":
        return str(left).lower() == str(right).lower()
    if operator == "contains_all":
        return set(str(item).lower() for item in right).issubset(_coerce_subjects(left))
    if operator == "contains_any":
        return bool(set(str(item).lower() for item in right).intersection(_coerce_subjects(left)))
    return False


def evaluate_row(row: pd.Series, rules: list[RuleDefinition]) -> dict:
    reasons: list[str] = []
    warnings: list[str] = []
    missing: list[str] = []

    for rule in rules:
        value = row.get(rule.field, "")
        passed = _compare(value, rule.operator, rule.value)
        if passed:
            continue

        if rule.rule_type == "subject_requirement":
            missing.extend(rule.value if isinstance(rule.value, list) else [str(rule.value)])
        elif rule.rule_type in {"entry_mode", "level"}:
            warnings.append(rule.message)
        else:
            reasons.append(rule.message)

    if reasons:
        status = "Not Qualified"
    elif warnings or missing:
        status = "Warning"
    else:
        status = "Qualified"

    return {
        "qualification_status": status,
        "reason": "; ".join(reasons) or "All mandatory checks passed.",
        "missing_requirements": ", ".join(missing),
        "warnings": "; ".join(warnings),
    }


def evaluate_dataframe(df: pd.DataFrame, rules: list[RuleDefinition]) -> pd.DataFrame:
    evaluations = df.apply(lambda row: evaluate_row(row, rules), axis=1, result_type="expand")
    return pd.concat([df.reset_index(drop=True), evaluations.reset_index(drop=True)], axis=1)

from __future__ import annotations

import pandas as pd

from app.models.schemas import FieldMapping


def apply_column_mapping(df: pd.DataFrame, mappings: list[FieldMapping]) -> pd.DataFrame:
    if not mappings:
        return df.copy()

    mapped = pd.DataFrame()
    for mapping in mappings:
        if mapping.source in df.columns:
            mapped[mapping.target] = df[mapping.source]
        else:
            mapped[mapping.target] = ""
    return mapped


def align_to_columns(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    if not columns:
        return df.copy()

    aligned = pd.DataFrame()
    for column in columns:
        aligned[column] = df[column] if column in df.columns else ""
    return aligned

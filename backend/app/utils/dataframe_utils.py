from __future__ import annotations

import re
from typing import Iterable

import pandas as pd


def normalize_header(value: object) -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return re.sub(r"_+", "_", text).strip("_")


def normalize_headers(columns: Iterable[object]) -> list[str]:
    normalized: list[str] = []
    seen: dict[str, int] = {}

    for column in columns:
        candidate = normalize_header(column) or "column"
        seen[candidate] = seen.get(candidate, 0) + 1
        normalized.append(candidate if seen[candidate] == 1 else f"{candidate}_{seen[candidate]}")

    return normalized


def frame_to_preview(df: pd.DataFrame, limit: int = 25) -> list[dict]:
    safe_df = df.copy().head(limit).fillna("")
    return safe_df.to_dict(orient="records")


def drop_fully_blank_rows(df: pd.DataFrame) -> pd.DataFrame:
    stripped = df.copy()
    string_columns = stripped.select_dtypes(include=["object", "string"]).columns
    if len(string_columns):
        stripped.loc[:, string_columns] = stripped.loc[:, string_columns].apply(lambda col: col.astype(str).str.strip())

    return stripped.replace("", pd.NA).dropna(how="all")

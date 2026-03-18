from __future__ import annotations

import pandas as pd

from app.models.schemas import SortMachineRequest
from app.services.mapping_service import align_to_columns
from app.utils.dataframe_utils import drop_fully_blank_rows


def _standardize_series(series: pd.Series, mode: str) -> pd.Series:
    if mode == "none":
        return series
    if mode == "upper":
        return series.astype(str).str.upper()
    if mode == "lower":
        return series.astype(str).str.lower()
    return series.astype(str).str.title()


def transform_dataset(df: pd.DataFrame, config: SortMachineRequest) -> pd.DataFrame:
    transformed = df.copy()

    if config.trim_spaces:
        string_columns = transformed.select_dtypes(include=["object", "string"]).columns
        transformed.loc[:, string_columns] = transformed.loc[:, string_columns].apply(lambda col: col.astype(str).str.strip())

    if config.standardize_case != "none":
        string_columns = transformed.select_dtypes(include=["object", "string"]).columns
        transformed.loc[:, string_columns] = transformed.loc[:, string_columns].apply(
            lambda col: _standardize_series(col, config.standardize_case)
        )

    if config.remove_blank_rows:
        transformed = drop_fully_blank_rows(transformed)

    if config.remove_keywords:
        keywords = [keyword.lower() for keyword in config.remove_keywords]
        mask = transformed.astype(str).apply(
            lambda col: ~col.str.lower().str.contains("|".join(keywords), na=False)
        )
        transformed = transformed[mask.all(axis=1)]

    for rule in config.replace_rules:
        if rule.column in transformed.columns:
            transformed[rule.column] = transformed[rule.column].replace(rule.old_value, rule.new_value)

    for column, value in config.fill_defaults.items():
        if column in transformed.columns:
            transformed[column] = transformed[column].fillna(value).replace("", value)
        else:
            transformed[column] = value

    for merge_rule in config.merge_rules:
        available = [column for column in merge_rule.source_columns if column in transformed.columns]
        if available:
            transformed[merge_rule.target_column] = transformed[available].fillna("").astype(str).agg(
                merge_rule.separator.join,
                axis=1,
            ).str.strip()

    if config.column_mapping:
        rename_map = {item.source: item.target for item in config.column_mapping if item.source in transformed.columns}
        transformed = transformed.rename(columns=rename_map)

    if config.export_columns:
        transformed = align_to_columns(transformed, config.export_columns)

    return transformed.reset_index(drop=True)

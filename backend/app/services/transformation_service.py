from __future__ import annotations

import pandas as pd

from app.models.schemas import SortMachineRequest
from app.services.splitter_service import apply_splitter_filters
from app.utils.dataframe_utils import drop_fully_blank_rows


def _standardize_series(series: pd.Series, mode: str) -> pd.Series:
    if mode == "none":
        return series
    if mode == "upper":
        return series.astype(str).str.upper()
    if mode == "lower":
        return series.astype(str).str.lower()
    return series.astype(str).str.title()


def _prepare_export_dataframe(df: pd.DataFrame, export_columns) -> pd.DataFrame:
    if not export_columns:
        return df.reset_index(drop=True)

    prepared = pd.DataFrame(index=df.index)
    for position, definition in enumerate(export_columns, start=1):
        heading = str(definition.target or "").strip() or f"Column {position}"

        if definition.kind == "serial_number":
            prepared[heading] = range(1, len(df.index) + 1)
            continue

        if definition.kind == "blank":
            prepared[heading] = ""
            continue

        source = str(definition.source or "").strip()
        prepared[heading] = df[source].values if source in df.columns else ""

    return prepared.reset_index(drop=True)


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

    if config.filters:
        transformed = apply_splitter_filters(transformed, config.filters)

    if config.remove_keywords:
        keywords = [keyword.lower() for keyword in config.remove_keywords]
        mask = transformed.astype(str).apply(
            lambda col: ~col.str.lower().str.contains("|".join(keywords), na=False)
        )
        transformed = transformed[mask.all(axis=1)]

    if config.excluded_row_ids:
        excluded = {int(row_id) for row_id in config.excluded_row_ids}
        transformed = transformed.loc[~transformed.index.isin(excluded)]

    if config.sort_by and config.sort_by in transformed.columns:
        transformed = transformed.assign(
            __sort_key=transformed[config.sort_by].fillna("").astype(str).str.casefold()
        ).sort_values(
            by="__sort_key",
            ascending=config.sort_direction != "desc",
            kind="mergesort",
        ).drop(columns="__sort_key")

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
        transformed = _prepare_export_dataframe(transformed, config.export_columns)

    return transformed.reset_index(drop=True)

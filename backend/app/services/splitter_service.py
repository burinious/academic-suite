from __future__ import annotations

from datetime import datetime
from pathlib import Path
import re

import pandas as pd
from fastapi import HTTPException

from app.models.schemas import ExportColumnDefinition, ExportTextRowDefinition, SplitterRequest, SplitterWorkspaceRequest
from app.services.export_service import export_dataframe, export_workbook, export_zip
from app.services.file_ingestion import read_raw_dataframe, save_dataframe_as_upload
from app.utils.dataframe_utils import drop_fully_blank_rows, normalize_header, normalize_headers


def run_splitter(request: SplitterRequest) -> dict:
    raw_df = read_raw_dataframe(request.file_id, request.sheet_name, header_row=request.header_row)
    raw_df = drop_fully_blank_rows(raw_df)

    original_columns = [_display_header_name(column, index) for index, column in enumerate(raw_df.columns, start=1)]
    normalized_columns = normalize_headers(original_columns)
    column_lookup = dict(zip(normalized_columns, original_columns))

    df = raw_df.copy()
    df.columns = normalized_columns
    df = apply_splitter_filters(df, request.filters)
    df = _apply_row_exclusions(df, request.excluded_row_ids)
    df = _apply_column_exclusions(
        df,
        request.excluded_columns,
        allow_empty=bool(request.export_columns),
    )

    split_column = normalize_header(request.split_column)
    if split_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Split column '{split_column}' was not found in the dataset.")

    grouped = {
        str(group_name): chunk.reset_index(drop=True)
        for group_name, chunk in df.groupby(split_column, dropna=False)
    }
    summary = (
        df.groupby(split_column, dropna=False)
        .size()
        .reset_index(name="count")
        .rename(columns={split_column: "group"})
    )

    export_grouped = {
        group_name: _prepare_export_dataframe(
            chunk,
            request.export_columns,
            column_lookup,
            request.preserve_source_headers,
        )
        for group_name, chunk in grouped.items()
    }
    export_summary = summary.copy()
    if request.preserve_source_headers:
        export_summary = export_summary.rename(columns={"group": column_lookup.get(split_column, request.split_column)})

    safe_date = datetime.now().strftime("%Y%m%d_%H%M")
    base_name = request.filename_pattern.replace("{date}", safe_date)
    preview = summary.fillna("").to_dict(orient="records")
    if request.export_mode == "separate_sheets":
        sheets = {
            group_name: {
                "dataframe": chunk,
                "top_rows": _render_group_text_rows(request.top_rows, group_name, grouped[group_name], split_column, column_lookup),
                "bottom_rows": _render_group_text_rows(request.bottom_rows, group_name, grouped[group_name], split_column, column_lookup),
            }
            for group_name, chunk in export_grouped.items()
        }
        if request.include_summary:
            sheets["summary"] = export_summary
        export = export_workbook(sheets, "Admission Splitter", base_name.replace("{group}", "all"))
    elif request.export_mode == "separate_files":
        last_export = None
        for group_name, chunk in export_grouped.items():
            output_name = base_name.replace("{group}", _slugify_group_name(group_name))
            last_export = export_dataframe(
                chunk,
                "Admission Splitter",
                output_name,
                export_format="xlsx",
                top_rows=_render_group_text_rows(request.top_rows, group_name, grouped[group_name], split_column, column_lookup),
                bottom_rows=_render_group_text_rows(request.bottom_rows, group_name, grouped[group_name], split_column, column_lookup),
            )
        export = last_export
    elif request.export_mode == "zipped_files":
        generated_paths = []
        for group_name, chunk in export_grouped.items():
            output_name = base_name.replace("{group}", _slugify_group_name(group_name))
            export_entry = export_dataframe(
                chunk,
                "Admission Splitter",
                output_name,
                export_format="xlsx",
                top_rows=_render_group_text_rows(request.top_rows, group_name, grouped[group_name], split_column, column_lookup),
                bottom_rows=_render_group_text_rows(request.bottom_rows, group_name, grouped[group_name], split_column, column_lookup),
            )
            generated_paths.append(read_export_path(export_entry))
        export = export_zip(generated_paths, "Admission Splitter", base_name.replace("{group}", "bundle"))
    else:
        raise HTTPException(status_code=400, detail="Unsupported export mode.")

    return {
        "job": export,
        "group_count": len(grouped),
        "summary": preview,
    }


def materialize_splitter_workspace(request: SplitterWorkspaceRequest) -> dict:
    df, column_lookup = _prepare_splitter_dataframe(
        request.file_id,
        request.sheet_name,
        request.header_row,
        request.filters,
        request.excluded_row_ids,
        request.excluded_columns,
        request.export_columns,
    )
    workspace_df = _prepare_export_dataframe(
        df,
        request.export_columns,
        column_lookup,
        request.preserve_source_headers,
    )
    return save_dataframe_as_upload(workspace_df, request.filename, suffix=".xlsx")


def read_export_path(export_entry: dict) -> Path:
    return Path(export_entry["path"])


def _restore_headers(df: pd.DataFrame, column_lookup: dict[str, str], preserve_source_headers: bool) -> pd.DataFrame:
    if not preserve_source_headers:
        return df
    return df.rename(columns=column_lookup)


def _display_header_name(value: object, index: int) -> str:
    text = str(value or "").strip()
    return text or f"Column {index}"


def _slugify_group_name(value: object) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", str(value or "blank").strip())
    cleaned = re.sub(r"_+", "_", cleaned).strip("._")
    return cleaned or "blank"


def apply_splitter_filters(df: pd.DataFrame, filters: list) -> pd.DataFrame:
    filtered = df.copy()

    for rule in filters:
        column_name = normalize_header(rule.column)
        if column_name not in filtered.columns or not str(rule.value).strip():
            continue

        series = filtered[column_name].fillna("").astype(str).str.strip()
        target = str(rule.value).strip()
        if rule.operator == "contains":
            mask = series.str.contains(re.escape(target), case=False, na=False)
        elif rule.operator == "not_contains":
            candidates = [
                value.strip()
                for value in re.split(r"[\n,;|]+", target)
                if str(value).strip()
            ]
            if not candidates:
                continue
            pattern = "|".join(re.escape(value) for value in candidates)
            mask = ~series.str.contains(pattern, case=False, na=False)
        elif rule.operator == "one_of":
            candidates = [
                value.casefold()
                for value in re.split(r"[\n,;|]+", target)
                if str(value).strip()
            ]
            if not candidates:
                continue
            mask = series.str.casefold().isin(candidates)
        elif rule.operator == "starts_with_one_of":
            prefixes = [
                value.casefold()
                for value in re.split(r"[\n,;|]+", target)
                if str(value).strip()
            ]
            if not prefixes:
                continue
            mask = series.str.casefold().apply(lambda value: any(value.startswith(prefix) for prefix in prefixes))
        elif rule.operator == "max_digits":
            try:
                max_digits = int(float(target))
            except ValueError:
                continue
            digit_lengths = series.str.replace(r"\D", "", regex=True).str.len()
            mask = digit_lengths <= max_digits
        else:
            mask = series.str.casefold() == target.casefold()

        filtered = filtered.loc[mask]

    return filtered


def _apply_row_exclusions(df: pd.DataFrame, excluded_row_ids: list[int]) -> pd.DataFrame:
    if not excluded_row_ids:
        return df

    row_ids = {int(row_id) for row_id in excluded_row_ids}
    return df.loc[~df.index.isin(row_ids)]


def _apply_column_exclusions(df: pd.DataFrame, excluded_columns: list[str], allow_empty: bool = False) -> pd.DataFrame:
    if not excluded_columns:
        return df

    normalized_exclusions = {normalize_header(column) for column in excluded_columns}
    surviving_columns = [column for column in df.columns if column not in normalized_exclusions]
    if not surviving_columns and not allow_empty:
        raise HTTPException(status_code=400, detail="All columns were removed from the export.")

    return df.loc[:, surviving_columns]


def _prepare_export_dataframe(
    df: pd.DataFrame,
    export_columns: list[ExportColumnDefinition],
    column_lookup: dict[str, str],
    preserve_source_headers: bool,
) -> pd.DataFrame:
    if not export_columns:
        return _restore_headers(df.reset_index(drop=True), column_lookup, preserve_source_headers)

    prepared = pd.DataFrame(index=df.index)
    for position, definition in enumerate(export_columns, start=1):
        heading = str(definition.target or "").strip() or f"Column {position}"
        if definition.kind == "serial_number":
            prepared[heading] = range(1, len(df.index) + 1)
            continue

        if definition.kind == "blank":
            prepared[heading] = ""
            continue

        source = normalize_header(definition.source or "")
        if source in df.columns:
            prepared[heading] = df[source].values
        else:
            prepared[heading] = ""

    return prepared.reset_index(drop=True)


def _prepare_splitter_dataframe(
    file_id: str,
    sheet_name: str | None,
    header_row: int | None,
    filters: list,
    excluded_row_ids: list[int],
    excluded_columns: list[str],
    export_columns: list[ExportColumnDefinition],
) -> tuple[pd.DataFrame, dict[str, str]]:
    raw_df = read_raw_dataframe(file_id, sheet_name, header_row=header_row)
    raw_df = drop_fully_blank_rows(raw_df)

    original_columns = [_display_header_name(column, index) for index, column in enumerate(raw_df.columns, start=1)]
    normalized_columns = normalize_headers(original_columns)
    column_lookup = dict(zip(normalized_columns, original_columns))

    df = raw_df.copy()
    df.columns = normalized_columns
    df = apply_splitter_filters(df, filters)
    df = _apply_row_exclusions(df, excluded_row_ids)
    df = _apply_column_exclusions(
        df,
        excluded_columns,
        allow_empty=bool(export_columns),
    )
    return df.reset_index(drop=True), column_lookup


def _render_group_text_rows(
    rows: list[ExportTextRowDefinition],
    group_name: str,
    chunk: pd.DataFrame,
    split_column: str,
    column_lookup: dict[str, str],
) -> list[dict[str, str | bool]]:
    tokens = _build_group_tokens(group_name, chunk, split_column, column_lookup)
    return [_render_text_row_definition(row, tokens) for row in rows]


def _build_group_tokens(
    group_name: str,
    chunk: pd.DataFrame,
    split_column: str,
    column_lookup: dict[str, str],
) -> dict[str, str]:
    display_split_column = column_lookup.get(split_column, split_column)
    tokens = {
        "group": str(group_name),
        "split_column": str(display_split_column),
        "split_key": str(display_split_column),
    }

    for column in chunk.columns:
        series = chunk[column].fillna("").astype(str).str.strip()
        unique_values = [value for value in series.drop_duplicates().tolist() if value]
        if len(unique_values) != 1:
            continue

        value = unique_values[0]
        tokens[str(column)] = value
        display_name = normalize_header(column_lookup.get(column, column))
        tokens[display_name] = value

    return tokens


def _apply_text_tokens(template: str, tokens: dict[str, str]) -> str:
    def replace(match: re.Match[str]) -> str:
        token_name = match.group(1).strip()
        transform = None
        base_token = token_name
        for suffix in ("_upper", "_lower", "_title"):
            if token_name.endswith(suffix):
                base_token = token_name[: -len(suffix)]
                transform = suffix
                break

        value = tokens.get(base_token)
        if value is None:
            return match.group(0)

        if transform == "_upper":
            return str(value).upper()
        if transform == "_lower":
            return str(value).lower()
        if transform == "_title":
            return str(value).title()

        return str(value)

    return re.sub(r"\{([^{}]+)\}", replace, str(template))


def _render_text_row_definition(
    row: ExportTextRowDefinition,
    tokens: dict[str, str],
) -> dict[str, str | bool]:
    text = ""
    if not row.is_blank:
        text = _apply_text_tokens(row.text, tokens)
        text = _apply_row_casing(text, row.casing)

    return {
        "text": text,
        "is_blank": row.is_blank,
        "merge_across": row.merge_across,
        "alignment": row.alignment,
    }


def _apply_row_casing(value: str, casing: str) -> str:
    if casing == "upper":
        return value.upper()
    if casing == "lower":
        return value.lower()
    if casing == "title":
        return value.title()
    if casing == "sentence":
        cleaned = value.strip()
        if not cleaned:
            return ""
        return cleaned[:1].upper() + cleaned[1:].lower()
    return value

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    file_id: str
    filename: str
    content_type: str | None = None
    size: int


class FileStructureResponse(BaseModel):
    file_id: str
    filename: str
    file_type: Literal["tabular", "docx_spec"]
    sheets: list[str] = Field(default_factory=list)
    sheet_name: str | None = None
    fields: list[str] = Field(default_factory=list)
    field_count: int = 0
    defaults: dict[str, Any] = Field(default_factory=dict)
    record_count: int = 0


class AuthUserResponse(BaseModel):
    id: str
    name: str
    email: str


class AuthSessionResponse(BaseModel):
    user: AuthUserResponse


class AuthSessionStateResponse(BaseModel):
    user: AuthUserResponse | None = None


class AuthStatusResponse(BaseModel):
    has_users: bool
    auth_provider: Literal["local", "firebase"] = "local"


class AuthRegisterRequest(BaseModel):
    name: str
    email: str
    password: str = Field(min_length=8)


class AuthLoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)


class PreviewResponse(BaseModel):
    file_id: str
    sheet_name: str | None = None
    resolved_header_row: int = 0
    columns: list[str]
    rows: list[dict[str, Any]]
    total_rows: int
    offset: int = 0
    limit: int = 25
    returned_rows: int = 0
    has_more: bool = False
    header_analysis: list[dict[str, Any]] = Field(default_factory=list)


class FieldMapping(BaseModel):
    source: str
    target: str


class LookupFillMapping(BaseModel):
    source: str
    target: str
    mode: Literal["replace", "fill_blank"] = "replace"


class ExportColumnDefinition(BaseModel):
    source: str | None = None
    target: str
    kind: Literal["source", "serial_number", "blank"] = "source"


class ExportTextRowDefinition(BaseModel):
    text: str = ""
    is_blank: bool = False
    merge_across: bool = False
    alignment: Literal["left", "center"] = "left"
    casing: Literal["none", "upper", "lower", "title", "sentence"] = "none"


class RuleDefinition(BaseModel):
    name: str
    rule_type: Literal["threshold", "subject_requirement", "programme_condition", "entry_mode", "level"]
    field: str
    operator: str
    value: Any
    message: str
    status: str = "Active"


class SplitterFilter(BaseModel):
    column: str
    operator: Literal["equals", "contains", "one_of", "not_contains", "max_digits", "starts_with_one_of"] = "equals"
    value: str


class SplitterRequest(BaseModel):
    file_id: str
    sheet_name: str | None = None
    header_row: int | None = None
    split_column: str
    filters: list[SplitterFilter] = Field(default_factory=list)
    excluded_columns: list[str] = Field(default_factory=list)
    excluded_row_ids: list[int] = Field(default_factory=list)
    top_rows: list[ExportTextRowDefinition] = Field(default_factory=list)
    bottom_rows: list[ExportTextRowDefinition] = Field(default_factory=list)
    export_mode: Literal["separate_sheets", "separate_files", "zipped_files"] = "separate_sheets"
    filename_pattern: str = "admission_{group}_{date}"
    include_summary: bool = True
    preserve_source_headers: bool = True
    export_columns: list[ExportColumnDefinition] = Field(default_factory=list)


class SplitterWorkspaceRequest(BaseModel):
    file_id: str
    sheet_name: str | None = None
    header_row: int | None = None
    filters: list[SplitterFilter] = Field(default_factory=list)
    excluded_columns: list[str] = Field(default_factory=list)
    excluded_row_ids: list[int] = Field(default_factory=list)
    preserve_source_headers: bool = True
    export_columns: list[ExportColumnDefinition] = Field(default_factory=list)
    filename: str = "admission_workspace_cleaned"


class LookupFillRequest(BaseModel):
    primary_file_id: str
    lookup_file_id: str
    primary_sheet_name: str | None = None
    lookup_sheet_name: str | None = None
    primary_key: str
    lookup_key: str
    mappings: list[LookupFillMapping] = Field(default_factory=list)
    output_name: str = "lookup_fill_output"


class NYSCSorterRequest(BaseModel):
    source_file_ids: list[str]
    spec_file_id: str | None = None
    template_file_id: str | None = None
    unique_key: str
    sheet_name: str | None = None
    source_sheet_names: dict[str, str] = Field(default_factory=dict)
    template_sheet_name: str | None = None
    mappings: list[FieldMapping] = Field(default_factory=list)
    target_fields: list[str] = Field(default_factory=list)
    output_name: str = "nysc_output"


class ReplaceRule(BaseModel):
    column: str
    old_value: str
    new_value: str


class MergeRule(BaseModel):
    source_columns: list[str]
    target_column: str
    separator: str = " "


class SortMachineRequest(BaseModel):
    file_id: str
    sheet_name: str | None = None
    export_format: Literal["xlsx", "csv"] = "xlsx"
    split_column: str | None = None
    split_export_mode: Literal["none", "separate_sheets", "zipped_files"] = "none"
    sort_by: str | None = None
    sort_direction: Literal["asc", "desc"] = "asc"
    trim_spaces: bool = True
    standardize_case: Literal["none", "title", "upper", "lower"] = "title"
    remove_blank_rows: bool = True
    filters: list[SplitterFilter] = Field(default_factory=list)
    excluded_row_ids: list[int] = Field(default_factory=list)
    remove_keywords: list[str] = Field(default_factory=list)
    replace_rules: list[ReplaceRule] = Field(default_factory=list)
    fill_defaults: dict[str, Any] = Field(default_factory=dict)
    merge_rules: list[MergeRule] = Field(default_factory=list)
    column_mapping: list[FieldMapping] = Field(default_factory=list)
    export_columns: list[ExportColumnDefinition] = Field(default_factory=list)
    top_rows: list[ExportTextRowDefinition] = Field(default_factory=list)
    bottom_rows: list[ExportTextRowDefinition] = Field(default_factory=list)


class AdmissionConfirmationRequest(BaseModel):
    file_id: str
    sheet_name: str | None = None
    rules: list[RuleDefinition] = Field(default_factory=list)


class PresetPayload(BaseModel):
    name: str
    data: dict[str, Any]

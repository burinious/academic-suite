from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    file_id: str
    filename: str
    content_type: str | None = None
    size: int


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
    columns: list[str]
    rows: list[dict[str, Any]]
    total_rows: int
    header_analysis: list[dict[str, Any]] = Field(default_factory=list)


class FieldMapping(BaseModel):
    source: str
    target: str


class RuleDefinition(BaseModel):
    name: str
    rule_type: Literal["threshold", "subject_requirement", "programme_condition", "entry_mode", "level"]
    field: str
    operator: str
    value: Any
    message: str
    status: str = "Active"


class SplitterRequest(BaseModel):
    file_id: str
    sheet_name: str | None = None
    split_column: str
    export_mode: Literal["separate_sheets", "separate_files", "zipped_files"] = "separate_sheets"
    filename_pattern: str = "admission_{group}_{date}"
    include_summary: bool = True


class NYSCSorterRequest(BaseModel):
    source_file_ids: list[str]
    template_file_id: str | None = None
    unique_key: str
    sheet_name: str | None = None
    mappings: list[FieldMapping] = Field(default_factory=list)
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
    trim_spaces: bool = True
    standardize_case: Literal["none", "title", "upper", "lower"] = "title"
    remove_blank_rows: bool = True
    remove_keywords: list[str] = Field(default_factory=list)
    replace_rules: list[ReplaceRule] = Field(default_factory=list)
    fill_defaults: dict[str, Any] = Field(default_factory=dict)
    merge_rules: list[MergeRule] = Field(default_factory=list)
    column_mapping: list[FieldMapping] = Field(default_factory=list)
    export_columns: list[str] = Field(default_factory=list)


class AdmissionConfirmationRequest(BaseModel):
    file_id: str
    sheet_name: str | None = None
    rules: list[RuleDefinition] = Field(default_factory=list)


class PresetPayload(BaseModel):
    name: str
    data: dict[str, Any]

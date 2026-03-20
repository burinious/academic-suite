import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Columns3,
  Download,
  Filter,
  FolderTree,
  Plus,
  RotateCcw,
  Rows4,
  Sparkles,
  SplitSquareVertical,
  WandSparkles,
  X,
} from "lucide-react";
import {
  buildDownloadUrl,
  deleteTemplate,
  getFilePreview,
  getFileSheets,
  getTemplates,
  materializeAdmissionSplitterWorkspace,
  runAdmissionSplitter,
  saveTemplate,
  uploadFile,
  uploadSampleFile,
} from "@/lib/api";
import { LoadingCard } from "@/components/shared/LoadingCard";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { PreviewTable } from "@/components/shared/PreviewTable";
import { UploadDropzone } from "@/components/shared/UploadDropzone";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const defaultFilter = () => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  column: "",
  operator: "equals",
  value: "",
});

const FULL_PREVIEW_BATCH_SIZE = 200;

const createExportColumn = (overrides = {}) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  source: null,
  target: "",
  kind: "blank",
  enabled: true,
  ...overrides,
});

const createTextRowDefinition = (overrides = {}) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  text: "",
  isBlank: false,
  mergeAcross: false,
  alignment: "left",
  casing: "none",
  ...overrides,
});

function formatLabelFromKey(value) {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getHeaderLabel(column, headerAnalysis) {
  const match = headerAnalysis.find((item) => item.normalized === column);
  return match?.original?.trim() || formatLabelFromKey(column);
}

function getDefaultExportLabel(column, headerAnalysis, preserveSourceHeaders) {
  if (!preserveSourceHeaders) {
    return formatLabelFromKey(column);
  }

  return getHeaderLabel(column, headerAnalysis);
}

function buildDefaultExportColumns(columns, headerAnalysis, preserveSourceHeaders) {
  return columns.map((column) =>
    createExportColumn({
      source: column,
      target: getDefaultExportLabel(column, headerAnalysis, preserveSourceHeaders),
      kind: "source",
    }),
  );
}

function buildSplitterPresetPayload({
  headerRowInput,
  splitColumn,
  exportMode,
  filenamePattern,
  includeSummary,
  preserveSourceHeaders,
  filters,
  exportColumns,
  topRowSettings,
  bottomRowSettings,
}) {
  return {
    template_type: "admission_splitter_preset",
    type: "Admission Splitter Preset",
    category: "Admission Analysis Splitter",
    description: "Reusable splitter setup for heading rows, filters, export columns, and text rows.",
    updatedAt: new Date().toISOString().slice(0, 10),
    config: {
      header_row_input: headerRowInput,
      split_column: splitColumn,
      export_mode: exportMode,
      filename_pattern: filenamePattern,
      include_summary: includeSummary,
      preserve_source_headers: preserveSourceHeaders,
    },
    filters,
    export_columns: exportColumns.map((column) => ({
      source: column.source,
      target: column.target,
      kind: column.kind,
      enabled: column.enabled,
    })),
    top_rows: topRowSettings.map((row) => ({
      text: row.text,
      isBlank: row.isBlank,
      mergeAcross: row.mergeAcross,
      alignment: row.alignment,
      casing: row.casing,
    })),
    bottom_rows: bottomRowSettings.map((row) => ({
      text: row.text,
      isBlank: row.isBlank,
      mergeAcross: row.mergeAcross,
      alignment: row.alignment,
      casing: row.casing,
    })),
  };
}

function applyClientFilters(rows, filters) {
  return filters.reduce((currentRows, filter) => {
    if (!filter.column || !filter.value.trim()) {
      return currentRows;
    }

    return currentRows.filter((row) => {
      const cellValue = String(row[filter.column] ?? "").trim();
      if (filter.operator === "contains") {
        return cellValue.toLowerCase().includes(filter.value.trim().toLowerCase());
      }
      if (filter.operator === "not_contains") {
        const candidates = filter.value
          .split(/[\n,;|]+/)
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean);
        return !candidates.some((candidate) => cellValue.toLowerCase().includes(candidate));
      }
      if (filter.operator === "one_of") {
        const candidates = filter.value
          .split(/[\n,;|]+/)
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean);
        return candidates.includes(cellValue.toLowerCase());
      }
      if (filter.operator === "starts_with_one_of") {
        const prefixes = filter.value
          .split(/[\n,;|]+/)
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean);
        return prefixes.some((prefix) => cellValue.toLowerCase().startsWith(prefix));
      }
      if (filter.operator === "max_digits") {
        const maxDigits = Number(filter.value);
        if (!Number.isFinite(maxDigits)) {
          return true;
        }
        const digitLength = cellValue.replace(/\D/g, "").length;
        return digitLength <= maxDigits;
      }

      return cellValue.toLowerCase() === filter.value.trim().toLowerCase();
    });
  }, rows);
}

function buildExportTextRows(rows) {
  return rows
    .map((row) => ({
      text: String(row.text ?? ""),
      is_blank: Boolean(row.isBlank),
      merge_across: Boolean(row.mergeAcross),
      alignment: row.alignment === "center" ? "center" : "left",
      casing: ["upper", "lower", "title", "sentence"].includes(row.casing) ? row.casing : "none",
    }))
    .filter((row) => row.is_blank || row.text.trim());
}

function describeTextRows(rows) {
  if (!rows.length) {
    return "No extra rows configured yet.";
  }

  const blankRows = rows.filter((row) => row.is_blank).length;
  const mergedRows = rows.filter((row) => row.merge_across).length;
  const details = [];
  if (blankRows) {
    details.push(`${blankRows} blank`);
  }
  if (mergedRows) {
    details.push(`${mergedRows} merged`);
  }

  return details.length ? `${rows.length} rows configured, ${details.join(", ")}.` : `${rows.length} rows configured.`;
}

function hideColumns(rows, hiddenColumns) {
  if (!hiddenColumns.length) {
    return rows;
  }

  const hidden = new Set(hiddenColumns);
  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).filter(([key]) => key.startsWith("__") || !hidden.has(key))),
  );
}

function removeDeletedRows(rows, deletedRowIds) {
  if (!deletedRowIds.length) {
    return rows;
  }

  const deleted = new Set(deletedRowIds);
  return rows.filter((row) => !deleted.has(row.__row_id));
}

function applyHeadingLayout(rows, exportColumns, deletedColumns = []) {
  const hiddenColumns = new Set(deletedColumns);
  const activeColumns = exportColumns.filter(
    (column) => column.enabled && (column.kind !== "source" || !hiddenColumns.has(column.source)),
  );

  if (!activeColumns.length) {
    return [];
  }

  return rows.map((row, index) => {
    const shapedRow = {
      __row_id: row.__row_id,
    };

    activeColumns.forEach((column, columnIndex) => {
      const heading = column.target.trim() || (column.kind === "serial_number" ? "S/N" : `Column ${columnIndex + 1}`);

      if (column.kind === "serial_number") {
        shapedRow[heading] = index + 1;
        return;
      }

      if (column.kind === "blank") {
        shapedRow[heading] = "";
        return;
      }

      shapedRow[heading] = row[column.source] ?? "";
    });

    return shapedRow;
  });
}

function TextRowsBuilderSection({
  title,
  description,
  rows,
  onAddTextRow,
  onAddBlankRow,
  onChange,
  onMove,
  onRemove,
}) {
  return (
    <div className="rounded-[24px] border border-violet-100 bg-white/80 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onAddTextRow}>
            <Plus className="mr-2 h-4 w-4" />
            Add Row
          </Button>
          <Button type="button" variant="outline" onClick={onAddBlankRow}>
            Add Empty Row
          </Button>
        </div>
      </div>

      {rows.length ? (
        <div className="mt-4 space-y-3">
          {rows.map((row, index) => (
            <div key={row.id} className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {row.isBlank ? `Blank Row ${index + 1}` : `Row ${index + 1}`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {row.isBlank
                      ? "This inserts an empty spacing row in the export."
                      : "Use tokens like {group_upper}, {split_column}, or {entry_mode_upper} inside the text."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => onMove(row.id, "up")} disabled={index === 0}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onMove(row.id, "down")}
                    disabled={index === rows.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                    onClick={() => onRemove(row.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.7fr))]">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Row Text</p>
                  <Input
                    value={row.text}
                    disabled={row.isBlank}
                    onChange={(event) => onChange(row.id, "text", event.target.value)}
                    placeholder={row.isBlank ? "Blank row" : "Type heading text or token pattern"}
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Row Type</p>
                  <Select value={row.isBlank ? "blank" : "text"} onChange={(event) => onChange(row.id, "isBlank", event.target.value === "blank")}>
                    <option value="text">Text Row</option>
                    <option value="blank">Empty Row</option>
                  </Select>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Case</p>
                  <Select value={row.casing} onChange={(event) => onChange(row.id, "casing", event.target.value)} disabled={row.isBlank}>
                    <option value="none">Keep As Typed</option>
                    <option value="upper">UPPER CASE</option>
                    <option value="lower">lower case</option>
                    <option value="sentence">Sentence case</option>
                    <option value="title">Title Case</option>
                  </Select>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Excel Layout</p>
                  <Button
                    type="button"
                    variant={row.mergeAcross ? "default" : "outline"}
                    className="w-full"
                    disabled={row.isBlank}
                    onClick={() => onChange(row.id, "mergeCenter", !row.mergeAcross)}
                  >
                    {row.mergeAcross ? "Merged + Centered" : "Merge + Center"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[18px] border border-dashed border-violet-200 bg-violet-50/60 px-4 py-4 text-sm text-slate-600">
          No rows added yet. Add a heading row or an empty spacing row for the export layout.
        </div>
      )}
    </div>
  );
}

export function AdmissionSplitterPage() {
  const [fileMeta, setFileMeta] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState("");
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [sheets, setSheets] = useState([]);
  const [sheetName, setSheetName] = useState("");
  const [headerRowInput, setHeaderRowInput] = useState("1");
  const [resolvedHeaderRow, setResolvedHeaderRow] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [preview, setPreview] = useState([]);
  const [fullPreviewRows, setFullPreviewRows] = useState([]);
  const [fullPreviewTotalRows, setFullPreviewTotalRows] = useState(0);
  const [fullPreviewHasMore, setFullPreviewHasMore] = useState(false);
  const [headerAnalysis, setHeaderAnalysis] = useState([]);
  const [exportColumns, setExportColumns] = useState([]);
  const [filters, setFilters] = useState([defaultFilter()]);
  const [deletedColumns, setDeletedColumns] = useState([]);
  const [deletedRowIds, setDeletedRowIds] = useState([]);
  const [splitColumn, setSplitColumn] = useState("");
  const [exportMode, setExportMode] = useState("zipped_files");
  const [filenamePattern, setFilenamePattern] = useState("admission_{group}_{date}");
  const [topRowSettings, setTopRowSettings] = useState([]);
  const [bottomRowSettings, setBottomRowSettings] = useState([]);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [preserveSourceHeaders, setPreserveSourceHeaders] = useState(true);
  const [status, setStatus] = useState({
    uploading: false,
    preview: false,
    fullPreview: false,
    running: false,
    materializing: false,
    loadingPresets: false,
    savingPreset: false,
    deletingPreset: false,
  });
  const [tipsOpen, setTipsOpen] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState(null);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showTextRowsPanel, setShowTextRowsPanel] = useState(false);
  const [formatTouched, setFormatTouched] = useState(false);

  const splitOptions = useMemo(
    () =>
      headerAnalysis
        .map((item) => ({
          value: item.normalized,
          label: item.original?.trim() || formatLabelFromKey(item.normalized),
        })),
    [headerAnalysis],
  );

  const activeFilters = useMemo(
    () => filters.filter((item) => item.column && item.value.trim()),
    [filters],
  );
  const splitterTemplates = useMemo(
    () => templates.filter((template) => template.template_type === "admission_splitter_preset"),
    [templates],
  );
  const selectedTemplate = useMemo(
    () => splitterTemplates.find((template) => template.name === selectedTemplateName) || null,
    [selectedTemplateName, splitterTemplates],
  );
  const topRows = useMemo(() => buildExportTextRows(topRowSettings), [topRowSettings]);
  const bottomRows = useMemo(() => buildExportTextRows(bottomRowSettings), [bottomRowSettings]);
  const hasUploadedWorkspace = Boolean(fileMeta && preview.length);
  const filteredSourcePreview = useMemo(
    () => hideColumns(removeDeletedRows(applyClientFilters(preview, filters), deletedRowIds), deletedColumns),
    [deletedColumns, deletedRowIds, filters, preview],
  );
  const filteredPreview = useMemo(
    () => applyHeadingLayout(filteredSourcePreview, exportColumns, deletedColumns),
    [deletedColumns, exportColumns, filteredSourcePreview],
  );
  const filteredFullPreview = useMemo(
    () => hideColumns(removeDeletedRows(fullPreviewRows, deletedRowIds), deletedColumns),
    [deletedColumns, deletedRowIds, fullPreviewRows],
  );
  const shapedFullPreview = useMemo(
    () => applyHeadingLayout(filteredFullPreview, exportColumns, deletedColumns),
    [deletedColumns, exportColumns, filteredFullPreview],
  );
  const visibleFullPreviewColumns = useMemo(
    () =>
      shapedFullPreview[0]
        ? Object.keys(shapedFullPreview[0]).filter((key) => !key.startsWith("__"))
        : exportColumns
            .filter((column) => column.enabled)
            .map((column, index) => column.target.trim() || (column.kind === "serial_number" ? "S/N" : `Column ${index + 1}`)),
    [exportColumns, shapedFullPreview],
  );
  const exportColumnsForRun = useMemo(
    () =>
      exportColumns
        .filter((column) => column.enabled)
        .filter((column) => column.kind !== "source" || !deletedColumns.includes(column.source))
        .map((column, index) => ({
          source: column.kind === "source" ? column.source : null,
          target: column.target.trim() || (column.kind === "serial_number" ? "S/N" : `Column ${index + 1}`),
          kind: column.kind,
        })),
    [deletedColumns, exportColumns],
  );
  const activeExportColumns = useMemo(() => exportColumns.filter((column) => column.enabled), [exportColumns]);
  const activeSplitLabel = splitColumn ? getHeaderLabel(splitColumn, headerAnalysis) : "Not set";
  const currentSheetLabel = sheetName && sheetName !== "csv_data" ? sheetName : "CSV";
  const currentExportModeLabel = exportMode.replace(/_/g, " ");
  const fullPreviewStatsTotal = fullPreviewRows.length ? fullPreviewTotalRows : totalRows;

  useEffect(() => {
    const loadTemplates = async () => {
      setStatus((current) => ({ ...current, loadingPresets: true }));
      try {
        const items = await getTemplates();
        setTemplates(items);
      } finally {
        setStatus((current) => ({ ...current, loadingPresets: false }));
      }
    };

    loadTemplates();
  }, []);

  useEffect(() => {
    if (fileMeta) {
      setTipsOpen(false);
    }
  }, [fileMeta]);

  useEffect(() => {
    if (!headerAnalysis.length || formatTouched) {
      return;
    }

    setExportColumns((current) => {
      const hasBlankOrSerial = current.some((column) => column.kind !== "source");
      if (hasBlankOrSerial) {
        return current.map((column) =>
          column.kind === "source"
            ? {
                ...column,
                target: getDefaultExportLabel(column.source, headerAnalysis, preserveSourceHeaders),
              }
            : column,
        );
      }

      return buildDefaultExportColumns(
        headerAnalysis.map((item) => item.normalized),
        headerAnalysis,
        preserveSourceHeaders,
      );
    });
  }, [formatTouched, headerAnalysis, preserveSourceHeaders]);

  const invalidateFullPreview = () => {
    setFullPreviewRows([]);
    setFullPreviewTotalRows(0);
    setFullPreviewHasMore(false);
  };

  const loadPreview = async (fileId, nextSheetName = "", nextHeaderRow = null) => {
    setStatus((current) => ({ ...current, preview: true }));
    setError("");
    setNotice("");

    try {
      const response = await getFilePreview(fileId, nextSheetName && nextSheetName !== "csv_data" ? nextSheetName : undefined, {
        headerRow: nextHeaderRow,
      });

      setPreview(response.rows || []);
      invalidateFullPreview();
      setHeaderAnalysis(response.header_analysis || []);
      setResolvedHeaderRow(response.resolved_header_row || 0);
      setHeaderRowInput(String((response.resolved_header_row || 0) + 1));
      setTotalRows(response.total_rows || 0);
      setDeletedColumns([]);
      setDeletedRowIds([]);
      setResult(null);
      setFormatTouched(false);
      setExportColumns(
        buildDefaultExportColumns(response.columns || [], response.header_analysis || [], preserveSourceHeaders),
      );

      const defaultSplit = response.columns?.includes(splitColumn) ? splitColumn : response.columns?.[0] || "";
      setSplitColumn(defaultSplit);
      setFilters((current) =>
        current.map((filter, index) =>
          index === 0
            ? {
                ...filter,
                column: response.columns?.includes(filter.column) ? filter.column : defaultSplit,
              }
            : filter,
        ),
      );
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, preview: false }));
    }
  };

  const hydrateFile = async (meta) => {
    setFileMeta(meta);
    setResult(null);
    setError("");
    setNotice("");

    const sheetPayload = await getFileSheets(meta.file_id);
    const availableSheets = sheetPayload.sheets || [];
    setSheets(availableSheets);

    const primarySheet = availableSheets[0] || "";
    setSheetName(primarySheet);
    await loadPreview(meta.file_id, primarySheet);
  };

  const handleUpload = async (file) => {
    setStatus((current) => ({ ...current, uploading: true }));
    try {
      const meta = await uploadFile(file);
      await hydrateFile(meta);
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, uploading: false }));
    }
  };

  const handleUseSample = async () => {
    setStatus((current) => ({ ...current, uploading: true }));
    try {
      const meta = await uploadSampleFile();
      await hydrateFile(meta);
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, uploading: false }));
    }
  };

  const handleSheetChange = async (value) => {
    setSheetName(value);
    if (fileMeta) {
      await loadPreview(fileMeta.file_id, value, Math.max(Number(headerRowInput || "1") - 1, 0));
    }
  };

  const handleHeaderRowApply = async () => {
    if (!fileMeta) {
      setError("Upload a file first before changing the header row.");
      return;
    }

    const parsed = Number(headerRowInput);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setError("Header row must be 1 or higher.");
      return;
    }

    await loadPreview(fileMeta.file_id, sheetName, parsed - 1);
  };

  const handleFilterChange = (id, field, value) => {
    invalidateFullPreview();
    setFilters((current) =>
      current.map((filter) => (filter.id === id ? { ...filter, [field]: value } : filter)),
    );
  };

  const handleAddFilter = () => {
    invalidateFullPreview();
    setFilters((current) => [...current, defaultFilter()]);
  };

  const handleRemoveFilter = (id) => {
    invalidateFullPreview();
    setFilters((current) => (current.length === 1 ? [defaultFilter()] : current.filter((filter) => filter.id !== id)));
  };

  const handleLoadFullPreview = async (append = false) => {
    if (!fileMeta) {
      setError("Upload a file first before loading the full preview.");
      return;
    }

    setStatus((current) => ({ ...current, fullPreview: true }));
    setError("");
    try {
      const response = await getFilePreview(
        fileMeta.file_id,
        sheetName && sheetName !== "csv_data" ? sheetName : undefined,
        {
          headerRow: Math.max(Number(headerRowInput || "1") - 1, 0),
          limit: FULL_PREVIEW_BATCH_SIZE,
          offset: append ? fullPreviewRows.length : 0,
          filters: activeFilters.map((filter) => ({
            column: filter.column,
            operator: filter.operator,
            value: filter.value.trim(),
          })),
        },
      );
      setFullPreviewRows((current) => (append ? [...current, ...(response.rows || [])] : response.rows || []));
      setFullPreviewTotalRows(response.total_rows || 0);
      setFullPreviewHasMore(Boolean(response.has_more));
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, fullPreview: false }));
    }
  };

  const handleDeleteColumn = (column) => {
    if (splitOptions.length <= 1) {
      setError("Keep at least one column in the preview.");
      return;
    }

    setDeletedColumns((current) => {
      if (current.includes(column)) {
        return current;
      }
      return [...current, column];
    });
    if (splitColumn === column) {
      const fallback = splitOptions.find((option) => option.value !== column)?.value || "";
      setSplitColumn(fallback);
    }
  };

  const handleDeleteRow = (rowId) => {
    setDeletedRowIds((current) => (current.includes(rowId) ? current : [...current, rowId]));
  };

  const handleResetPreviewEdits = () => {
    setDeletedColumns([]);
    setDeletedRowIds([]);
    setNotice("Preview edits cleared. All rows and columns are visible again.");
  };

  const handleMoveExportColumn = (id, direction) => {
    setFormatTouched(true);
    setExportColumns((current) => {
      const index = current.findIndex((column) => column.id === id);
      if (index < 0) {
        return current;
      }

      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const nextColumns = [...current];
      [nextColumns[index], nextColumns[nextIndex]] = [nextColumns[nextIndex], nextColumns[index]];
      return nextColumns;
    });
  };

  const handleToggleExportColumn = (id) => {
    setFormatTouched(true);
    setExportColumns((current) =>
      current.map((column) => (column.id === id ? { ...column, enabled: !column.enabled } : column)),
    );
  };

  const handleDeleteExportColumn = (id) => {
    setFormatTouched(true);
    setError("");
    setExportColumns((current) => {
      if (current.length === 1) {
        setError("Keep at least one heading in the workbench.");
        return current;
      }

      const columnToDelete = current.find((column) => column.id === id);
      const nextColumns = current.filter((column) => column.id !== id);
      if (columnToDelete?.kind === "source" && splitColumn === columnToDelete.source) {
        const fallback = nextColumns.find((column) => column.kind === "source" && column.enabled)?.source || "";
        setSplitColumn(fallback);
      }

      return nextColumns;
    });
  };

  const handleExportColumnChange = (id, field, value) => {
    setFormatTouched(true);
    setExportColumns((current) =>
      current.map((column) => (column.id === id ? { ...column, [field]: value } : column)),
    );
  };

  const handleAddBlankHeading = () => {
    setFormatTouched(true);
    setExportColumns((current) => [
      ...current,
      createExportColumn({
        kind: "blank",
        target: `Custom Heading ${current.filter((column) => column.kind === "blank").length + 1}`,
      }),
    ]);
  };

  const handleAddSerialNumber = () => {
    setFormatTouched(true);
    setExportColumns((current) => {
      const existingSerial = current.find((column) => column.kind === "serial_number");
      if (existingSerial) {
        return current.map((column) =>
          column.kind === "serial_number" ? { ...column, enabled: true, target: column.target || "S/N" } : column,
        );
      }

      return [
        createExportColumn({
          kind: "serial_number",
          target: "S/N",
        }),
        ...current,
      ];
    });
  };

  const handleResetHeadingLayout = () => {
    setFormatTouched(false);
    setExportColumns(
      buildDefaultExportColumns(
        headerAnalysis.map((item) => item.normalized),
        headerAnalysis,
        preserveSourceHeaders,
      ),
    );
    setNotice("Detected headings restored to the source order.");
  };

  const handleApplyTemplate = () => {
    if (!selectedTemplate) {
      setError("Choose a saved splitter template first.");
      return;
    }

    if (!headerAnalysis.length) {
      setError("Upload and preview a file first so the template can match the current headings.");
      return;
    }

    const sourceColumns = new Set(headerAnalysis.map((item) => item.normalized));
    const savedColumns = (selectedTemplate.export_columns || [])
      .filter((column) => column.kind !== "source" || sourceColumns.has(column.source))
      .map((column, index) =>
        createExportColumn({
          source: column.source,
          target: column.target || (column.kind === "serial_number" ? "S/N" : `Column ${index + 1}`),
          kind: column.kind || "source",
          enabled: column.enabled ?? true,
        }),
      );

    const nextSplitColumn = sourceColumns.has(selectedTemplate.config?.split_column)
      ? selectedTemplate.config.split_column
      : headerAnalysis[0]?.normalized || "";

    setHeaderRowInput(String(selectedTemplate.config?.header_row_input || headerRowInput));
    setSplitColumn(nextSplitColumn);
    setExportMode(selectedTemplate.config?.export_mode || "zipped_files");
    setFilenamePattern(selectedTemplate.config?.filename_pattern || "admission_{group}_{date}");
    setIncludeSummary(selectedTemplate.config?.include_summary ?? true);
    setPreserveSourceHeaders(selectedTemplate.config?.preserve_source_headers ?? true);
    setFilters(
      (selectedTemplate.filters || []).length
        ? selectedTemplate.filters.map((filter) => ({
            ...defaultFilter(),
            column: sourceColumns.has(filter.column) ? filter.column : nextSplitColumn,
            operator: filter.operator || "equals",
            value: filter.value || "",
          }))
        : [defaultFilter()],
    );
    setExportColumns(
      savedColumns.length
        ? savedColumns
        : buildDefaultExportColumns(headerAnalysis.map((item) => item.normalized), headerAnalysis, preserveSourceHeaders),
    );
    setTopRowSettings(
      (selectedTemplate.top_rows || []).map((row) =>
        createTextRowDefinition({
          text: row.text || "",
          isBlank: Boolean(row.isBlank),
          mergeAcross: Boolean(row.mergeAcross),
          alignment: row.alignment || "left",
          casing: row.casing || "none",
        }),
      ),
    );
    setBottomRowSettings(
      (selectedTemplate.bottom_rows || []).map((row) =>
        createTextRowDefinition({
          text: row.text || "",
          isBlank: Boolean(row.isBlank),
          mergeAcross: Boolean(row.mergeAcross),
          alignment: row.alignment || "left",
          casing: row.casing || "none",
        }),
      ),
    );
    setFormatTouched(true);
    setDeletedColumns([]);
    setDeletedRowIds([]);
    invalidateFullPreview();
    setNotice(`Applied template: ${selectedTemplate.name}`);
    setError("");
  };

  const handleSaveTemplate = async () => {
    if (!headerAnalysis.length) {
      setError("Upload and prepare a splitter workspace before saving a template.");
      return;
    }

    const displayName = templateNameInput.trim();
    if (!displayName) {
      setError("Enter a template name before saving.");
      return;
    }

    setStatus((current) => ({ ...current, savingPreset: true }));
    setError("");
    try {
      await saveTemplate(
        displayName,
        buildSplitterPresetPayload({
          headerRowInput,
          splitColumn,
          exportMode,
          filenamePattern,
          includeSummary,
          preserveSourceHeaders,
          filters,
          exportColumns,
          topRowSettings,
          bottomRowSettings,
        }),
      );
      const refreshedTemplates = await getTemplates();
      setTemplates(refreshedTemplates);
      setSelectedTemplateName(displayName);
      setTemplateNameInput("");
      setNotice(`Saved template: ${displayName}`);
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, savingPreset: false }));
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateName) {
      setError("Choose a saved template first.");
      return;
    }

    setStatus((current) => ({ ...current, deletingPreset: true }));
    setError("");
    try {
      await deleteTemplate(selectedTemplateName);
      const deletedName = selectedTemplateName;
      const refreshedTemplates = await getTemplates();
      setTemplates(refreshedTemplates);
      setSelectedTemplateName("");
      setNotice(`Deleted template: ${deletedName}`);
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, deletingPreset: false }));
    }
  };

  const updateTextRows = (position, updater) => {
    if (position === "top") {
      setTopRowSettings((current) => updater(current));
      return;
    }

    setBottomRowSettings((current) => updater(current));
  };

  const handleAddTextRow = (position, isBlank = false) => {
    const shouldPrimeAsHeading = position === "top" && !isBlank;
    updateTextRows(position, (current) => [
      ...current,
      createTextRowDefinition({
        isBlank,
        mergeAcross: shouldPrimeAsHeading && current.length < 3,
        alignment: shouldPrimeAsHeading && current.length < 3 ? "center" : "left",
      }),
    ]);
  };

  const handleTextRowChange = (position, id, field, value) => {
    updateTextRows(position, (current) =>
      current.map((row) => {
        if (row.id !== id) {
          return row;
        }

        if (field === "isBlank") {
          return {
            ...row,
            isBlank: Boolean(value),
            text: value ? "" : row.text,
            mergeAcross: value ? false : row.mergeAcross,
            alignment: value ? "left" : row.alignment,
          };
        }

        if (field === "mergeCenter") {
          return {
            ...row,
            mergeAcross: Boolean(value),
            alignment: value ? "center" : "left",
          };
        }

        return { ...row, [field]: value };
      }),
    );
  };

  const handleMoveTextRow = (position, id, direction) => {
    updateTextRows(position, (current) => {
      const index = current.findIndex((row) => row.id === id);
      if (index < 0) {
        return current;
      }

      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const nextRows = [...current];
      [nextRows[index], nextRows[nextIndex]] = [nextRows[nextIndex], nextRows[index]];
      return nextRows;
    });
  };

  const handleRemoveTextRow = (position, id) => {
    updateTextRows(position, (current) => current.filter((row) => row.id !== id));
  };

  const handleUseCurrentAsUpload = async () => {
    if (!fileMeta) {
      setError("Upload a workbook or CSV first.");
      return;
    }

    if (!exportColumnsForRun.length) {
      setError("Keep at least one heading before creating a new upload.");
      return;
    }

    setStatus((current) => ({ ...current, materializing: true }));
    setError("");
    setNotice("");

    try {
      const nextUpload = await materializeAdmissionSplitterWorkspace({
        file_id: fileMeta.file_id,
        sheet_name: sheetName && sheetName !== "csv_data" ? sheetName : null,
        header_row: Math.max(Number(headerRowInput || "1") - 1, 0),
        filters: activeFilters.map((filter) => ({
          column: filter.column,
          operator: filter.operator,
          value: filter.value.trim(),
        })),
        excluded_columns: deletedColumns,
        excluded_row_ids: deletedRowIds,
        preserve_source_headers: preserveSourceHeaders,
        export_columns: exportColumnsForRun,
        filename: `${(fileMeta.filename || "admission_workspace").replace(/\.[^.]+$/, "")}_cleaned`,
      });

      await hydrateFile(nextUpload);
      setNotice("Current adjustment has been turned into a new upload. You are now working from the cleaned dataset.");
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, materializing: false }));
    }
  };

  const handleRun = async () => {
    if (!fileMeta) {
      setError("Upload a workbook or CSV first.");
      return;
    }

    if (!splitColumn) {
      setError("Choose a split column before running the export.");
      return;
    }

    if (!exportColumnsForRun.length) {
      setError("Keep at least one output heading before running the export.");
      return;
    }

    setStatus((current) => ({ ...current, running: true }));
    setError("");
    setNotice("");

    try {
      const response = await runAdmissionSplitter({
        file_id: fileMeta.file_id,
        sheet_name: sheetName && sheetName !== "csv_data" ? sheetName : null,
        header_row: Math.max(Number(headerRowInput || "1") - 1, 0),
        split_column: splitColumn,
        filters: activeFilters.map((filter) => ({
          column: filter.column,
          operator: filter.operator,
          value: filter.value.trim(),
        })),
        excluded_columns: deletedColumns,
        excluded_row_ids: deletedRowIds,
        top_rows: topRows,
        bottom_rows: bottomRows,
        export_mode: exportMode,
        filename_pattern: filenamePattern.trim() || "admission_{group}_{date}",
        include_summary: includeSummary,
        preserve_source_headers: preserveSourceHeaders,
        export_columns: exportColumnsForRun,
      });

      setResult(response);
      setNotice("Admission Analysis Splitter finished successfully.");
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, running: false }));
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Module 01"
        title="Admission Analysis Splitter"
        description="Upload a register, let the system detect the real heading row, narrow it with filters, then split the cleaned view into grouped export packs."
        actions={
          <>
            <Button variant="outline" onClick={() => setTipsOpen((current) => !current)}>
              <Sparkles className="mr-2 h-4 w-4" />
              {tipsOpen ? "Hide Tips" : "Show Tips"}
            </Button>
            <Button onClick={handleRun} disabled={!fileMeta || status.running}>
              {status.running ? "Running..." : "Run Splitter"}
            </Button>
            {result?.job ? (
              <a href={buildDownloadUrl(result.job.id)}>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download {result.job.format}
                </Button>
              </a>
            ) : null}
          </>
        }
      />

      <AnimatePresence>
        {tipsOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.24 }}
            className="overflow-hidden rounded-[30px] border border-sky-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eff6ff_40%,#ecfeff_100%)] p-6 shadow-[0_24px_70px_rgba(14,165,233,0.12)]"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                  <WandSparkles className="h-3.5 w-3.5" />
                  Quick Tips
                </div>
                <h2 className="mt-4 font-display text-2xl font-bold text-slate-950">
                  Keep this module simple: filter first, split second.
                </h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[22px] border border-white/80 bg-white/75 p-4 text-sm leading-6 text-slate-600">
                    Matriculation workbooks like the ones you shared usually start their real headings on row 4.
                  </div>
                  <div className="rounded-[22px] border border-white/80 bg-white/75 p-4 text-sm leading-6 text-slate-600">
                    Student details CSV exports usually begin on row 2 because row 1 is just a block title.
                  </div>
                  <div className="rounded-[22px] border border-white/80 bg-white/75 p-4 text-sm leading-6 text-slate-600">
                    Use filters for things like level, programme, gender, or state before splitting by the final field.
                  </div>
                  <div className="rounded-[22px] border border-white/80 bg-white/75 p-4 text-sm leading-6 text-slate-600">
                    Keep source headings on if you want the export to preserve the exact heading style you love.
                  </div>
                </div>
              </div>
              <Button variant="outline" onClick={() => setTipsOpen(false)}>
                Close Tips
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <section className="grid gap-4 xl:grid-cols-4">
        <Card className="overflow-hidden border-sky-200 bg-[linear-gradient(140deg,rgba(240,249,255,0.96),rgba(255,255,255,0.94))]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">1. Source File</p>
              <p className="mt-3 font-display text-2xl font-bold text-slate-950">{fileMeta ? "Loaded" : "Waiting"}</p>
              <p className="mt-2 text-sm text-slate-500">{fileMeta?.filename || "Attach a register or try the sample dataset."}</p>
            </div>
            <div className="rounded-2xl bg-slate-950 p-3 text-white">
              <SplitSquareVertical className="h-5 w-5" />
            </div>
          </div>
          <Button className="mt-5 w-full" onClick={handleUseSample} disabled={status.uploading}>
            {status.uploading ? "Loading..." : "Load Sample"}
          </Button>
        </Card>

        <Card className="overflow-hidden border-amber-200 bg-[linear-gradient(140deg,rgba(255,251,235,0.98),rgba(255,255,255,0.94))]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">2. Heading Row</p>
              <p className="mt-3 font-display text-2xl font-bold text-slate-950">{resolvedHeaderRow + 1}</p>
              <p className="mt-2 text-sm text-slate-500">Refresh the preview after adjusting the row number.</p>
            </div>
            <div className="rounded-2xl bg-slate-950 p-3 text-white">
              <Rows4 className="h-5 w-5" />
            </div>
          </div>
          <Button variant="outline" className="mt-5 w-full" onClick={handleHeaderRowApply} disabled={!fileMeta || status.preview}>
            {status.preview ? "Refreshing..." : "Refresh Heading"}
          </Button>
        </Card>

        <Card className="overflow-hidden border-teal-200 bg-[linear-gradient(140deg,rgba(240,253,250,0.98),rgba(255,255,255,0.94))]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">3. Filters</p>
              <p className="mt-3 font-display text-2xl font-bold text-slate-950">{activeFilters.length}</p>
              <p className="mt-2 text-sm text-slate-500">
                {splitOptions.length ? `${splitOptions.length} fields available for narrowing the data.` : "Load a file to unlock filter fields."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 p-3 text-white">
              <Filter className="h-5 w-5" />
            </div>
          </div>
          <Button variant="outline" className="mt-5 w-full" onClick={handleAddFilter} disabled={!splitOptions.length}>
            <Plus className="mr-2 h-4 w-4" />
            Add Filter
          </Button>
        </Card>

        <Card className="overflow-hidden border-slate-200 bg-[linear-gradient(140deg,rgba(248,250,252,0.98),rgba(255,255,255,0.94))]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">4. Split Export</p>
              <p className="mt-3 font-display text-2xl font-bold text-slate-950">{result?.group_count || 0}</p>
              <p className="mt-2 text-sm text-slate-500">
                {result ? "Groups generated from the latest run." : "Run the splitter when the preview looks right."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 p-3 text-white">
              <FolderTree className="h-5 w-5" />
            </div>
          </div>
          <Button className="mt-5 w-full" onClick={handleRun} disabled={!fileMeta || status.running}>
            {status.running ? "Running..." : "Run Splitter"}
          </Button>
        </Card>
      </section>

      {error ? (
        <Card className="border border-rose-200 bg-rose-50/90">
          <p className="text-sm font-medium text-rose-800">{error}</p>
        </Card>
      ) : null}

      {!error && notice ? (
        <Card className="border border-emerald-200 bg-emerald-50/90">
          <p className="text-sm font-medium text-emerald-800">{notice}</p>
        </Card>
      ) : null}

      <Card className="border-slate-200 bg-[linear-gradient(140deg,rgba(255,255,255,0.97),rgba(248,250,252,0.94))]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle>Splitter Templates</CardTitle>
            <CardDescription className="mt-1">
              Save the current Admission Analysis Splitter setup and reuse it later, or delete templates you no longer need.
            </CardDescription>
          </div>
          <div className="rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {splitterTemplates.length} saved
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Saved Templates</p>
              <Select
                value={selectedTemplateName}
                onChange={(event) => setSelectedTemplateName(event.target.value)}
                disabled={status.loadingPresets || !splitterTemplates.length}
              >
                <option value="">
                  {status.loadingPresets ? "Loading templates..." : splitterTemplates.length ? "Choose a saved template" : "No saved templates yet"}
                </option>
                {splitterTemplates.map((template) => (
                  <option key={template.name} value={template.name}>
                    {template.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Button variant="outline" onClick={handleApplyTemplate} disabled={!selectedTemplateName || !headerAnalysis.length}>
                Apply Template
              </Button>
              <Button
                variant="outline"
                className="border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                onClick={handleDeleteTemplate}
                disabled={!selectedTemplateName || status.deletingPreset}
              >
                {status.deletingPreset ? "Deleting..." : "Delete Template"}
              </Button>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white/85 p-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">Save Current Setup As</p>
            <div className="grid gap-3">
              <Input
                value={templateNameInput}
                onChange={(event) => setTemplateNameInput(event.target.value)}
                placeholder="Example: UTME 100 level split"
              />
              <Button onClick={handleSaveTemplate} disabled={status.savingPreset || !headerAnalysis.length}>
                {status.savingPreset ? "Saving..." : "Save Template"}
              </Button>
            </div>
            <p className="mt-3 text-xs leading-6 text-slate-500">
              Templates capture heading row choice, filters, output columns, split settings, and text rows around export.
            </p>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 xl:grid-cols-4">
          <UploadDropzone
            title={hasUploadedWorkspace ? "Dataset loaded" : "Upload register or student details file"}
            subtitle={
              hasUploadedWorkspace
                ? "Replace the current file or load a fresh sample dataset."
                : "Drop a CSV or Excel workbook here. The splitter will detect the heading row and prepare the preview."
            }
            onFileSelect={handleUpload}
            onUseSample={handleUseSample}
            selectedFileName={fileMeta?.filename}
            loading={status.uploading}
            compact={hasUploadedWorkspace}
          />

          <Card className="border-sky-100 bg-white/88">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                <SplitSquareVertical className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Split Configuration</CardTitle>
                <CardDescription className="mt-1">
                  Point the preview at the correct sheet and header row, then filter and split the result.
                </CardDescription>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {sheets.length > 1 ? (
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Sheet</p>
                  <Select value={sheetName} onChange={(event) => handleSheetChange(event.target.value)}>
                    {sheets.map((sheet) => (
                      <option key={sheet} value={sheet}>
                        {sheet}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Header Row</p>
                  <Input
                    type="number"
                    min="1"
                    value={headerRowInput}
                    onChange={(event) => setHeaderRowInput(event.target.value)}
                    placeholder="1"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Auto-detected row: {resolvedHeaderRow + 1}
                  </p>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="w-full" onClick={handleHeaderRowApply} disabled={!fileMeta || status.preview}>
                    Refresh Preview
                  </Button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Split Column</p>
                <Select value={splitColumn} onChange={(event) => setSplitColumn(event.target.value)} disabled={!splitOptions.length}>
                  <option value="">{splitOptions.length ? "Choose split column" : "Upload and preview a file first"}</option>
                  {splitOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Export Mode</p>
                  <Select value={exportMode} onChange={(event) => setExportMode(event.target.value)}>
                    <option value="separate_sheets">Separate Sheets</option>
                    <option value="separate_files">Separate Files</option>
                    <option value="zipped_files">Zipped Files</option>
                  </Select>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Filename Pattern</p>
                  <Input
                    value={filenamePattern}
                    onChange={(event) => setFilenamePattern(event.target.value)}
                    placeholder="admission_{group}_{date}"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-white/75 px-4 py-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeSummary}
                    onChange={(event) => setIncludeSummary(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Add summary sheet
                </label>
                <label className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-white/75 px-4 py-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={preserveSourceHeaders}
                    onChange={(event) => setPreserveSourceHeaders(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Preserve source headings
                </label>
              </div>
            </div>
          </Card>

          <Card className="border-violet-200 bg-[linear-gradient(140deg,rgba(255,255,255,0.94),rgba(245,243,255,0.96))]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
                  <Rows4 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Text Rows Around Export</CardTitle>
                  <CardDescription className="mt-1">
                    Build the heading rows above or below each exported table. You can add empty rows, merge and center heading lines, and use tokens like <code>{`{group_upper}`}</code> or <code>{`{entry_mode_upper}`}</code>.
                  </CardDescription>
                </div>
              </div>
              {hasUploadedWorkspace ? (
                <Button variant="outline" onClick={() => setShowTextRowsPanel((current) => !current)}>
                  {showTextRowsPanel ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                  {showTextRowsPanel ? "Collapse" : "Expand"}
                </Button>
              ) : null}
            </div>

            {!hasUploadedWorkspace || showTextRowsPanel ? (
              <div className="mt-5 grid gap-4">
                <TextRowsBuilderSection
                  title="Rows Before Table"
                  description="These lines appear before the column headings in each export. This is where merged school titles, office labels, programme headings, and empty spacing rows should live."
                  rows={topRowSettings}
                  onAddTextRow={() => handleAddTextRow("top")}
                  onAddBlankRow={() => handleAddTextRow("top", true)}
                  onChange={(id, field, value) => handleTextRowChange("top", id, field, value)}
                  onMove={(id, direction) => handleMoveTextRow("top", id, direction)}
                  onRemove={(id) => handleRemoveTextRow("top", id)}
                />

                <TextRowsBuilderSection
                  title="Rows Below Table"
                  description="Use this for signatures, notes, spacing, or footer instructions after the dataset rows."
                  rows={bottomRowSettings}
                  onAddTextRow={() => handleAddTextRow("bottom")}
                  onAddBlankRow={() => handleAddTextRow("bottom", true)}
                  onChange={(id, field, value) => handleTextRowChange("bottom", id, field, value)}
                  onMove={(id, direction) => handleMoveTextRow("bottom", id, direction)}
                  onRemove={(id) => handleRemoveTextRow("bottom", id)}
                />
              </div>
            ) : (
              <div className="mt-4 rounded-[20px] border border-violet-100 bg-white/75 px-4 py-3 text-sm text-slate-600">
                {topRows.length || bottomRows.length
                  ? `${describeTextRows(topRows)} ${describeTextRows(bottomRows)}`
                  : "No extra text rows configured yet."}
              </div>
            )}
          </Card>

          <Card className="border-teal-100 bg-[linear-gradient(140deg,rgba(255,255,255,0.96),rgba(240,253,250,0.88))]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-teal-100 p-3 text-teal-700">
                  <Filter className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Filters Before Split</CardTitle>
                  <CardDescription className="mt-1">
                    Narrow the dataset with simple equals or contains filters before creating groups.
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-full border border-teal-100 bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                  {activeFilters.length} active
                </div>
                {hasUploadedWorkspace ? (
                  <Button variant="outline" onClick={() => setShowFiltersPanel((current) => !current)}>
                    {showFiltersPanel ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                    {showFiltersPanel ? "Collapse" : "Expand"}
                  </Button>
                ) : null}
                <Button variant="outline" onClick={handleAddFilter} disabled={!splitOptions.length}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Filter
                </Button>
              </div>
            </div>

            {!hasUploadedWorkspace || showFiltersPanel ? (
              <div className="mt-5 space-y-3">
                {filters.map((filter, index) => (
                  <div key={filter.id} className="rounded-[24px] border border-teal-100 bg-white/85 p-4 shadow-[0_10px_26px_rgba(15,118,110,0.05)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">
                        Filter {index + 1}
                      </div>
                      <Button variant="ghost" className="rounded-2xl" onClick={() => handleRemoveFilter(filter.id)} aria-label="Remove filter">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr_1.2fr]">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Field</p>
                        <Select value={filter.column} onChange={(event) => handleFilterChange(filter.id, "column", event.target.value)}>
                          <option value="">Select column</option>
                          {splitOptions.map((option) => (
                            <option key={`${filter.id}-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Condition</p>
                        <Select value={filter.operator} onChange={(event) => handleFilterChange(filter.id, "operator", event.target.value)}>
                          <option value="equals">Equals</option>
                          <option value="contains">Contains</option>
                          <option value="not_contains">Does Not Contain</option>
                          <option value="one_of">One Of</option>
                          <option value="starts_with_one_of">Starts With One Of</option>
                          <option value="max_digits">Max Digits</option>
                        </Select>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Value</p>
                        <Input
                          value={filter.value}
                          onChange={(event) => handleFilterChange(filter.id, "value", event.target.value)}
                          placeholder={
                            filter.operator === "one_of"
                              ? "Example: 100 LEVEL, 200 LEVEL"
                              : filter.operator === "not_contains"
                                ? "Example: PART/TIME, TOP/UP, PRE/DEGREE"
                                : filter.operator === "starts_with_one_of"
                                  ? "Example: 20255, 20259"
                                : filter.operator === "max_digits"
                                  ? "Example: 5"
                                  : "Enter filter value"
                          }
                        />
                        {filter.operator === "one_of" || filter.operator === "not_contains" || filter.operator === "starts_with_one_of" ? (
                          <p className="mt-2 text-xs text-slate-500">Separate multiple values with commas, line breaks, semicolons, or `|`.</p>
                        ) : null}
                        {filter.operator === "starts_with_one_of" ? (
                          <p className="mt-2 text-xs text-slate-500">Useful for keeping only JAMB registration rows that begin with selected year prefixes.</p>
                        ) : null}
                        {filter.operator === "max_digits" ? (
                          <p className="mt-2 text-xs text-slate-500">Use this on matric number fields to drop rows with more digits than allowed.</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[20px] border border-teal-100 bg-white/75 px-4 py-3 text-sm text-slate-600">
                {activeFilters.length ? `${activeFilters.length} active filters ready for the split run.` : "No active filters yet."}
              </div>
            )}
          </Card>
      </section>

      {status.preview ? <LoadingCard title="Reading sheet structure and preparing preview..." /> : null}

      {!status.preview && preview.length ? (
        <Card className="mt-5 border-slate-200 bg-[linear-gradient(140deg,rgba(255,255,255,0.97),rgba(248,250,252,0.94))]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <Columns3 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Detected Headings</CardTitle>
                <CardDescription className="mt-1">
                  Use this board to shape the final export order, decide the split target, rename headings, and insert extra output columns.
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {activeExportColumns.length} export fields
              </div>
              <Button variant="outline" onClick={handleAddSerialNumber}>
                Add S/N
              </Button>
              <Button variant="outline" onClick={handleAddBlankHeading}>
                <Plus className="mr-2 h-4 w-4" />
                Add Heading
              </Button>
              <Button variant="outline" onClick={handleResetHeadingLayout} disabled={!headerAnalysis.length}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Format
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Split Target</p>
              <p className="mt-2 font-display text-xl font-bold text-slate-950">{activeSplitLabel}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Sheet</p>
              <p className="mt-2 font-display text-xl font-bold text-slate-950">{currentSheetLabel}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Output Mode</p>
              <p className="mt-2 font-display text-xl font-bold uppercase text-slate-950">{currentExportModeLabel}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Available Source Fields</p>
              <p className="mt-2 font-display text-xl font-bold text-slate-950">{splitOptions.length}</p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[26px] border border-slate-200 bg-slate-50/80">
            <div className="grid grid-cols-[72px_minmax(220px,1fr)_minmax(220px,1fr)_auto] gap-3 border-b border-slate-200 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <span>Order</span>
              <span>Source Field</span>
              <span>Output Heading</span>
              <span className="text-right">Actions</span>
            </div>

            <div className="max-h-[440px] overflow-auto">
              <div className="space-y-3 p-3">
                {exportColumns.map((column, index) => {
                  const isActiveSplit = column.kind === "source" && splitColumn === column.source;
                  const isSourceHidden = column.kind === "source" && deletedColumns.includes(column.source);
                  const sourceLabel =
                    column.kind === "serial_number"
                      ? "Generated serial number"
                      : column.kind === "blank"
                        ? "Custom blank column"
                        : getHeaderLabel(column.source, headerAnalysis);

                  return (
                    <div
                      key={column.id}
                      className={`grid gap-3 rounded-[22px] border px-4 py-4 lg:grid-cols-[72px_minmax(220px,1fr)_minmax(220px,1fr)_auto] ${
                        column.enabled
                          ? "border-slate-200 bg-white/92"
                          : "border-slate-100 bg-slate-50/85 opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between rounded-[18px] bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                        <span>{index + 1}</span>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveExportColumn(column.id, "up")}
                            className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 transition hover:border-slate-300"
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveExportColumn(column.id, "down")}
                            className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 transition hover:border-slate-300"
                            disabled={index === exportColumns.length - 1}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-950">{sourceLabel}</p>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            {column.kind === "source" ? "Source" : column.kind === "serial_number" ? "S/N" : "Blank"}
                          </span>
                          {isSourceHidden ? (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                              Hidden In Preview
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-500">
                          {column.kind === "source" ? column.source : column.kind === "serial_number" ? "Auto-generated numbering column." : "Manual heading with blank values."}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Output Heading</p>
                        <Input
                          value={column.target}
                          onChange={(event) => handleExportColumnChange(column.id, "target", event.target.value)}
                          placeholder={column.kind === "serial_number" ? "S/N" : "Type heading text"}
                        />
                      </div>

                      <div className="flex flex-wrap items-start justify-end gap-2">
                        {column.kind === "source" ? (
                          <Button
                            variant={isActiveSplit ? "default" : "outline"}
                            onClick={() => setSplitColumn(column.source)}
                          >
                            {isActiveSplit ? "Split Target" : "Use For Split"}
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          className={
                            column.enabled
                              ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
                              : "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100"
                          }
                          onClick={() => handleToggleExportColumn(column.id)}
                        >
                          {column.enabled ? "Exclude" : "Include"}
                        </Button>
                        <Button
                          variant="outline"
                          className="border-rose-300 bg-white text-rose-700 hover:border-rose-400 hover:bg-rose-50"
                          onClick={() => handleDeleteExportColumn(column.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {!status.preview && filteredPreview.length ? (
        <PreviewTable
          title="Quick Filtered Preview"
          description="A fast sample view of the active filter result before loading the full editable preview."
          data={filteredPreview}
          maxHeightClass="max-h-[420px] xl:max-h-[48vh]"
        />
      ) : null}

      {!status.preview ? (
        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Complete Filtered Preview</CardTitle>
              <CardDescription className="mt-1">
                Work in filtered batches here. Open the first chunk, edit rows or columns, then use Show More to load the next filtered set.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleResetPreviewEdits} disabled={!deletedColumns.length && !deletedRowIds.length}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Edits
              </Button>
              <Button
                variant="outline"
                onClick={handleUseCurrentAsUpload}
                disabled={!fileMeta || status.materializing || !filteredPreview.length}
              >
                {status.materializing ? "Saving..." : "Use Current View As Upload"}
              </Button>
              <Button variant="outline" onClick={() => handleLoadFullPreview(false)} disabled={!fileMeta || status.fullPreview}>
                {status.fullPreview ? "Loading..." : fullPreviewRows.length ? "Reload First Batch" : "Open Full Workbench"}
              </Button>
              <Button
                onClick={() => handleLoadFullPreview(true)}
                disabled={!fileMeta || status.fullPreview || !fullPreviewRows.length || !fullPreviewHasMore}
              >
                {status.fullPreview ? "Loading..." : fullPreviewHasMore ? "Show More" : "All Loaded"}
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Filtered Rows</p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-950">{fullPreviewStatsTotal}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Loaded Into Workbench</p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-950">{fullPreviewRows.length}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Rows Removed</p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-950">{deletedRowIds.length}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Columns Hidden</p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-950">{deletedColumns.length}</p>
            </div>
          </div>

          {!fullPreviewRows.length ? (
            <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 px-5 py-8 text-center">
              <p className="text-sm font-medium text-slate-700">Open the workbench to start editing the filtered dataset.</p>
              <p className="mt-2 text-sm text-slate-500">
                The page now loads the first filtered batch only. Use Show More when you need more rows, not the entire file at once.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white/90">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{filteredFullPreview.length} visible rows</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                    {fullPreviewHasMore ? "More rows available" : "Current filter fully loaded"}
                  </span>
                </div>
                <span>{activeFilters.length ? `${activeFilters.length} active filters` : "No filters applied"}</span>
              </div>

              <div className="max-h-[420px] xl:max-h-[48vh] overflow-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                    <tr>
                      <th className="w-28 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Row
                      </th>
                      {visibleFullPreviewColumns.map((column) => (
                        <th key={column} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          <div className="min-w-[160px]">
                            <span className="truncate">{column}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white/80">
                    {shapedFullPreview.map((row) => (
                      <tr key={row.__row_id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700">{row.__row_id + 1}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.__row_id)}
                              className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
                            >
                              Drop
                            </button>
                          </div>
                        </td>
                        {visibleFullPreviewColumns.map((column) => (
                          <td key={`${row.__row_id}-${column}`} className="max-w-[220px] px-4 py-3 align-top text-sm text-slate-700">
                            <div className="truncate">{String(row[column] ?? "")}</div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      ) : null}

      {status.running ? <LoadingCard title="Applying filters, grouping records, and writing exports..." /> : null}

      <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Export Stage</CardTitle>
                <CardDescription className="mt-1">
                  When the preview looks right, run the splitter and download the grouped output pack.
                </CardDescription>
              </div>
              <div className="rounded-2xl bg-slate-950 p-3 text-white">
                <FolderTree className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200 bg-white/75 p-4">
                <p className="text-sm text-slate-500">Split field</p>
                <p className="mt-2 font-display text-2xl font-bold text-slate-950">
                  {splitColumn ? getHeaderLabel(splitColumn, headerAnalysis) : "Not set"}
                </p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-white/75 p-4">
                <p className="text-sm text-slate-500">Export mode</p>
                <p className="mt-2 font-display text-2xl font-bold uppercase text-slate-950">
                  {exportMode.replace(/_/g, " ")}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={handleRun} disabled={!fileMeta || status.running}>
                {status.running ? "Running..." : "Generate Split Export"}
              </Button>
              {result?.job ? (
                <a href={buildDownloadUrl(result.job.id)}>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download {result.job.file}
                  </Button>
                </a>
              ) : null}
            </div>
      </Card>
    </div>
  );
}

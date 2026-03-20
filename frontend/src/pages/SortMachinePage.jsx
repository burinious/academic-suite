import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpenCheck,
  ChevronRight,
  Download,
  MousePointerClick,
} from "lucide-react";
import {
  buildDownloadUrl,
  getFilePreview,
  getFileSheets,
  getTemplates,
  runSortMachine,
  saveTemplate,
  uploadFile,
  uploadSampleFile,
} from "@/lib/api";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { SortMachineWorkbench } from "@/components/sort-machine/SortMachineWorkbench";
import { Button } from "@/components/ui/button";

const initialConfig = {
  trim_spaces: true,
  remove_blank_rows: true,
  standardize_case: "title",
  export_format: "xlsx",
  split_column: "",
  split_export_mode: "none",
  sort_by: "",
  sort_direction: "asc",
};

const GUIDE_STORAGE_KEY = "adps:sort-machine-guide-seen";
const FULL_PREVIEW_BATCH_SIZE = 200;

const defaultFilter = () => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  column: "",
  operator: "equals",
  value: "",
});

function humanizeHeader(value) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function createColumnState(columns) {
  return columns.map((column) => ({
    id: `source:${column}`,
    source: column,
    target: humanizeHeader(column),
    selected: true,
    kind: "source",
  }));
}

function createBlankHeadingColumn() {
  const id = `blank:${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  return {
    id,
    source: null,
    target: "New Heading",
    selected: true,
    kind: "blank",
  };
}

function createSortPresetPayload(config, keywordInput, columns, includeSerialNumber) {
  return {
    template_type: "sort_machine_preset",
    type: "Sort Machine Preset",
    category: "Sort Machine",
    description: "Reusable cleaning, column mapping, split, and export setup for repeated sorting jobs.",
    updatedAt: new Date().toISOString().slice(0, 10),
    fields: columns.filter((column) => column.selected).length,
    config,
    include_serial_number: includeSerialNumber,
    keyword_input: keywordInput,
    column_settings: columns.map((column) => ({
      kind: column.kind || "source",
      source: column.source,
      target: column.target,
      selected: column.selected,
    })),
  };
}

function applySortPresetToState(preset, currentColumns) {
  const savedColumns = new Map(
    (preset.column_settings || [])
      .filter((column) => (column.kind || "source") === "source")
      .map((column) => [column.source, column]),
  );
  const nextSourceColumns = currentColumns.map((column) => {
    const saved = savedColumns.get(column.source);
    if (!saved) {
      return column;
    }

    return {
      ...column,
      selected: saved.selected ?? column.selected,
      target: saved.target?.trim() ? saved.target : column.target,
    };
  });
  const customColumns = (preset.column_settings || [])
    .filter((column) => (column.kind || "source") === "blank")
    .map((column) => ({
      ...createBlankHeadingColumn(),
      target: column.target?.trim() || "New Heading",
      selected: column.selected ?? true,
      kind: "blank",
    }));
  const nextColumns = [...nextSourceColumns, ...customColumns];

  const nextConfigBase = { ...initialConfig, ...(preset.config || {}) };
  const availableSplitTargets = nextColumns
    .filter((column) => column.selected)
    .map((column) => column.target.trim() || humanizeHeader(column.source));

  return {
    columns: nextColumns,
    includeSerialNumber: Boolean(preset.include_serial_number),
    config: {
      ...nextConfigBase,
      split_column: availableSplitTargets.includes(nextConfigBase.split_column || "")
        ? nextConfigBase.split_column
        : "",
    },
    keywordInput: preset.keyword_input || "",
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

function removeDeletedRows(rows, deletedRowIds) {
  if (!deletedRowIds.length) {
    return rows;
  }

  const deleted = new Set(deletedRowIds);
  return rows.filter((row) => !deleted.has(row.__row_id));
}

function sortRows(rows, sortBy, sortDirection) {
  if (!sortBy) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    const leftValue = String(left[sortBy] ?? "").toLowerCase();
    const rightValue = String(right[sortBy] ?? "").toLowerCase();
    if (leftValue === rightValue) {
      return 0;
    }
    const base = leftValue > rightValue ? 1 : -1;
    return sortDirection === "desc" ? -base : base;
  });
}

function applyColumnLayout(rows, columns, includeSerialNumber = false) {
  const activeColumns = columns.filter((column) => column.selected);
  if (!activeColumns.length && !includeSerialNumber) {
    return [];
  }

  return rows.map((row, index) => {
    const shapedRow = {
      __row_id: row.__row_id,
    };

    if (includeSerialNumber) {
      shapedRow["S/N"] = index + 1;
    }

    activeColumns.forEach((column) => {
      if (column.kind === "serial_number") {
        return;
      }
      const heading =
        column.target.trim() ||
        (column.kind === "blank" ? `Heading ${index + 1}` : humanizeHeader(column.source || ""));
      shapedRow[heading] = column.kind === "blank" ? "" : row[column.source] ?? "";
    });

    return shapedRow;
  });
}

export function SortMachinePage() {
  const uploadSectionRef = useRef(null);
  const cleanSectionRef = useRef(null);
  const columnsSectionRef = useRef(null);
  const exportSectionRef = useRef(null);
  const [fileMeta, setFileMeta] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [sheetName, setSheetName] = useState("");
  const [preview, setPreview] = useState([]);
  const [fullPreviewRows, setFullPreviewRows] = useState([]);
  const [fullPreviewTotalRows, setFullPreviewTotalRows] = useState(0);
  const [fullPreviewHasMore, setFullPreviewHasMore] = useState(false);
  const [resultPreview, setResultPreview] = useState([]);
  const [columns, setColumns] = useState([]);
  const [includeSerialNumber, setIncludeSerialNumber] = useState(false);
  const [headerAnalysis, setHeaderAnalysis] = useState([]);
  const [config, setConfig] = useState(initialConfig);
  const [filters, setFilters] = useState([defaultFilter()]);
  const [deletedRowIds, setDeletedRowIds] = useState([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [status, setStatus] = useState({
    uploading: false,
    preview: false,
    fullPreview: false,
    processing: false,
    loadingPresets: false,
    savingPreset: false,
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [job, setJob] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState("");
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [guideIndex, setGuideIndex] = useState(0);

  const sortMachineTemplates = useMemo(
    () => templates.filter((template) => template.template_type === "sort_machine_preset"),
    [templates],
  );

  const selectedTemplate = useMemo(
    () => sortMachineTemplates.find((template) => template.name === selectedTemplateName) || null,
    [selectedTemplateName, sortMachineTemplates],
  );

  const activeSteps = useMemo(
    () => [
      { id: "01", title: "Upload", detail: fileMeta ? "Dataset attached" : "Attach a CSV or Excel workbook", done: Boolean(fileMeta) },
      { id: "02", title: "Clean", detail: "Trim, normalize, and filter raw values", done: Boolean(preview.length) },
      { id: "03", title: "Columns", detail: "Select fields and rename export headers", done: columns.some((column) => column.selected) },
      { id: "04", title: "Export", detail: job ? "Export ready to download" : "Run and generate final file", done: Boolean(job) },
    ],
    [columns, fileMeta, job, preview.length],
  );

  const selectedColumnsCount = useMemo(
    () => columns.filter((column) => column.selected).length,
    [columns],
  );

  const removedKeywordCount = useMemo(
    () =>
      keywordInput
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean).length,
    [keywordInput],
  );

  const splitTargetLabel = config.split_column || "Not set";
  const splitModeLabel = config.split_export_mode === "none" ? "Single output" : config.split_export_mode.replace(/_/g, " ");
  const currentSheetLabel = sheetName && sheetName !== "csv_data" ? sheetName : "CSV";
  const filterOptions = useMemo(
    () =>
      columns
        .filter((column) => column.kind === "source")
        .map((column) => ({
          value: column.source,
          label: column.target.trim() || humanizeHeader(column.source),
        })),
    [columns],
  );
  const activeFilters = useMemo(
    () => filters.filter((filter) => filter.column && filter.value.trim()),
    [filters],
  );
  const quickPreviewRows = useMemo(
    () =>
      applyColumnLayout(
        sortRows(removeDeletedRows(applyClientFilters(preview, filters), deletedRowIds), config.sort_by, config.sort_direction),
        columns,
        includeSerialNumber,
      ),
    [columns, config.sort_by, config.sort_direction, deletedRowIds, filters, includeSerialNumber, preview],
  );
  const shapedFullPreview = useMemo(
    () => applyColumnLayout(removeDeletedRows(fullPreviewRows, deletedRowIds), columns, includeSerialNumber),
    [columns, deletedRowIds, fullPreviewRows, includeSerialNumber],
  );
  const visibleFullPreviewColumns = useMemo(
    () =>
      shapedFullPreview[0]
        ? Object.keys(shapedFullPreview[0]).filter((key) => !key.startsWith("__"))
        : [
            ...(includeSerialNumber ? ["S/N"] : []),
            ...columns
              .filter((column) => column.selected)
              .map((column, index) => column.target.trim() || (column.kind === "blank" ? `Heading ${index + 1}` : humanizeHeader(column.source || ""))),
          ],
    [columns, includeSerialNumber, shapedFullPreview],
  );

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
    if (typeof window === "undefined") {
      return;
    }

    if (!window.localStorage.getItem(GUIDE_STORAGE_KEY)) {
      setShowGuide(true);
    }
  }, []);

  useEffect(() => {
    const activeTargets = columns
      .filter((column) => column.selected && column.kind === "source")
      .map((column) => column.target.trim() || humanizeHeader(column.source || ""));

    if (config.split_column && !activeTargets.includes(config.split_column)) {
      setConfig((current) => ({ ...current, split_column: "" }));
    }

    if (config.sort_by && !columns.some((column) => column.kind === "source" && column.source === config.sort_by)) {
      setConfig((current) => ({ ...current, sort_by: "" }));
    }
  }, [columns, config.sort_by, config.split_column]);

  const invalidateFullPreview = () => {
    setFullPreviewRows([]);
    setFullPreviewTotalRows(0);
    setFullPreviewHasMore(false);
  };

  const loadPreview = async (fileId, selectedSheet = "") => {
    setStatus((current) => ({ ...current, preview: true }));
    setError("");
    setNotice("");
    try {
      const resolvedSheet = selectedSheet && selectedSheet !== "csv_data" ? selectedSheet : undefined;
      const data = await getFilePreview(fileId, resolvedSheet);
      setPreview(data.rows);
      setHeaderAnalysis(data.header_analysis || []);
      invalidateFullPreview();
      setResultPreview([]);
      setJob(null);
      setColumns(createColumnState(data.columns));
      setIncludeSerialNumber(false);
      setDeletedRowIds([]);
      setFilters((current) =>
        current.map((filter, index) =>
          index === 0
            ? {
                ...filter,
                column: data.columns?.includes(filter.column) ? filter.column : data.columns?.[0] || "",
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
    setError("");
    setNotice("");
    const sheetPayload = await getFileSheets(meta.file_id);
    setSheets(sheetPayload.sheets);
    const primarySheet = sheetPayload.sheets[0] || "";
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
      await loadPreview(fileMeta.file_id, value);
    }
  };

  const handleToggleColumn = (columnId) => {
    invalidateFullPreview();
    setColumns((current) =>
      current.map((column) => (column.id === columnId ? { ...column, selected: !column.selected } : column)),
    );
  };

  const handleRenameColumn = (columnId, target) => {
    invalidateFullPreview();
    setColumns((current) =>
      current.map((column) => (column.id === columnId ? { ...column, target } : column)),
    );
  };

  const handleAddHeading = () => {
    invalidateFullPreview();
    setColumns((current) => [...current, createBlankHeadingColumn()]);
    setNotice("Blank heading added. Rename it to shape the export.");
  };

  const handleToggleSerialNumber = () => {
    invalidateFullPreview();
    setIncludeSerialNumber((current) => !current);
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

  const handleDeleteRow = (rowId) => {
    setDeletedRowIds((current) => (current.includes(rowId) ? current : [...current, rowId]));
  };

  const handleResetPreviewEdits = () => {
    setDeletedRowIds([]);
    setNotice("Clean preview edits cleared. Removed rows are visible again.");
  };

  const handleLoadFullPreview = async (append = false) => {
    if (!fileMeta) {
      setError("Upload a file first before opening the cleaning preview.");
      return;
    }

    setStatus((current) => ({ ...current, fullPreview: true }));
    setError("");
    try {
      const response = await getFilePreview(
        fileMeta.file_id,
        sheetName && sheetName !== "csv_data" ? sheetName : undefined,
        {
          limit: FULL_PREVIEW_BATCH_SIZE,
          offset: append ? fullPreviewRows.length : 0,
          filters: activeFilters.map((filter) => ({
            column: filter.column,
            operator: filter.operator,
            value: filter.value.trim(),
          })),
          sortBy: config.sort_by,
          sortDirection: config.sort_direction,
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

  const handleApplyTemplate = () => {
    if (!selectedTemplate) {
      setError("Choose a saved preset first.");
      setNotice("");
      return;
    }

    if (!columns.length) {
      setError("Upload or preview a file first so the preset can match your current columns.");
      setNotice("");
      return;
    }

      const nextState = applySortPresetToState(selectedTemplate, columns);
      setColumns(nextState.columns);
      setConfig(nextState.config);
      setIncludeSerialNumber(nextState.includeSerialNumber);
      setKeywordInput(nextState.keywordInput);
    setResultPreview([]);
    setJob(null);
    setError("");
    setNotice(`Applied preset: ${selectedTemplate.name}`);
  };

  const handleResetWorkbench = () => {
    if (!preview.length || !columns.length) {
      setError("Upload a file first before resetting the workbench.");
      setNotice("");
      return;
    }

    const resetColumns = createColumnState(
      columns.filter((column) => column.kind === "source").map((column) => column.source),
    );
    setConfig(initialConfig);
    setIncludeSerialNumber(false);
    setFilters([defaultFilter()]);
    setDeletedRowIds([]);
    invalidateFullPreview();
    setKeywordInput("");
    setColumns(resetColumns);
    setResultPreview([]);
    setJob(null);
    setError("");
    setNotice("Sort Machine settings reset to the default workbench state.");
  };

  const handleSaveTemplate = async () => {
    if (!columns.length) {
      setError("Upload a file and review the workbench before saving a preset.");
      setNotice("");
      return;
    }

    const displayName = templateNameInput.trim();
    if (!displayName) {
      setError("Enter a preset name before saving.");
      setNotice("");
      return;
    }

    setStatus((current) => ({ ...current, savingPreset: true }));
    setError("");
    setNotice("");

    try {
      await saveTemplate(displayName, createSortPresetPayload(config, keywordInput, columns, includeSerialNumber));
      const refreshedTemplates = await getTemplates();
      setTemplates(refreshedTemplates);
      setSelectedTemplateName(displayName);
      setTemplateNameInput("");
      setNotice(`Saved preset: ${displayName}`);
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, savingPreset: false }));
    }
  };

  const handleRun = async () => {
    if (!fileMeta) {
      setError("Upload a file before running the workbench.");
      setNotice("");
      return;
    }

    setStatus((current) => ({ ...current, processing: true }));
    setError("");
    setNotice("");

    const selectedSourceColumns = columns.filter((column) => column.selected && column.kind === "source");
    const selectedColumns = columns.filter((column) => column.selected);
    const columnMapping = selectedSourceColumns.map((column) => ({
      source: column.source,
      target: column.target.trim() || humanizeHeader(column.source),
    }));
    const exportColumns = [
      ...(includeSerialNumber ? [{ source: null, target: "S/N", kind: "serial_number" }] : []),
      ...selectedColumns.map((column, index) => ({
        source: column.kind === "source" ? column.target.trim() || humanizeHeader(column.source || "") : null,
        target:
          column.target.trim() ||
          (column.kind === "blank" ? `Heading ${index + 1}` : humanizeHeader(column.source || "")),
        kind: column.kind,
      })),
    ];

    try {
      const response = await runSortMachine({
        file_id: fileMeta.file_id,
        sheet_name: sheetName && sheetName !== "csv_data" ? sheetName : null,
        export_format: config.export_format,
        split_column: config.split_column || null,
        split_export_mode: config.split_export_mode || "none",
        sort_by: config.sort_by || null,
        sort_direction: config.sort_direction || "asc",
        trim_spaces: config.trim_spaces,
        remove_blank_rows: config.remove_blank_rows,
        standardize_case: config.standardize_case,
        filters: activeFilters.map((filter) => ({
          column: filter.column,
          operator: filter.operator,
          value: filter.value.trim(),
        })),
        excluded_row_ids: deletedRowIds,
        remove_keywords: keywordInput
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        column_mapping: columnMapping,
        export_columns: exportColumns,
      });
      setResultPreview(response.preview);
      setJob(response.job);
      setNotice("Sort Machine run completed successfully.");
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, processing: false }));
    }
  };

  const guideSteps = useMemo(
    () => [
      {
        id: "upload",
        title: "Start with a file",
        body: "Upload a CSV/XLSX file or load the sample dataset. This unlocks preview, cleaning, column rename, and export controls.",
        accent: "Upload unlocks the rest of the machine.",
      },
      {
        id: "clean",
        title: "Tune cleanup rules",
        body: "Use the clean panel to trim spaces, standardize values, drop blank rows, and remove unwanted records by keyword.",
        accent: "This is where messy data becomes workable.",
      },
      {
        id: "columns",
        title: "Control what leaves the system",
        body: "Keep or drop columns and rename each export heading. Your final file shape is defined here.",
        accent: "Editing happens after preview is loaded.",
      },
      {
        id: "export",
        title: "Split and export",
        body: "Choose format, split mode, and run the export. When the job finishes, download the clean file or ZIP bundle.",
        accent: "You can reopen this guide anytime from the header.",
      },
    ],
    [],
  );

  const currentGuideStep = guideSteps[guideIndex];

  const scrollToSection = (section) => {
    const refMap = {
      upload: uploadSectionRef,
      clean: cleanSectionRef,
      columns: columnsSectionRef,
      export: exportSectionRef,
    };

    refMap[section]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openGuide = (section = null) => {
    if (section) {
      const matchingIndex = guideSteps.findIndex((step) => step.id === section);
      if (matchingIndex >= 0) {
        setGuideIndex(matchingIndex);
      }
    }
    setShowGuide(true);
  };

  const closeGuide = (persist = true) => {
    setShowGuide(false);
    if (persist && typeof window !== "undefined") {
      window.localStorage.setItem(GUIDE_STORAGE_KEY, "true");
    }
  };

  const handleGuideAction = async () => {
    const section = currentGuideStep?.id;
    if (!section) {
      return;
    }

    if (section === "upload" && !fileMeta) {
      await handleUseSample();
    }

    scrollToSection(section);
  };

  const highlightSection = (section) =>
    showGuide && currentGuideStep?.id === section
      ? "rounded-[30px] ring-2 ring-sky-300 ring-offset-4 ring-offset-slate-50 transition"
      : "";

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Foundation Workbench"
        title="Sort Machine"
        description="Tonight's working foundation lives here: upload, preview, clean, select columns, rename headers, save reusable presets, and export through one premium processing flow."
        actions={
          <>
            <Button variant="outline" onClick={() => openGuide()}>
              <BookOpenCheck className="mr-2 h-4 w-4" />
              Guide Me
            </Button>
            <Button onClick={handleRun} disabled={!fileMeta || status.processing}>
              {status.processing ? "Processing..." : "Run Export"}
            </Button>
            {job ? (
              <a href={buildDownloadUrl(job.id)}>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download {job.format}
                </Button>
              </a>
            ) : null}
          </>
        }
      />

      <AnimatePresence>
        {showGuide ? (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-[30px] border border-sky-200 bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_52%,#ecfeff_100%)] p-6 shadow-[0_24px_60px_rgba(14,165,233,0.12)]"
          >
            <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-sky-200/60 blur-3xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                  <MousePointerClick className="h-3.5 w-3.5" />
                  In-System Guide
                </div>
                <h2 className="mt-4 font-display text-2xl font-bold text-slate-950">
                  {guideIndex + 1}. {currentGuideStep.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{currentGuideStep.body}</p>
                <p className="mt-3 text-sm font-semibold text-sky-700">{currentGuideStep.accent}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {guideSteps.map((step, index) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setGuideIndex(index)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        index === guideIndex
                          ? "bg-slate-950 text-white"
                          : "border border-slate-200 bg-white/80 text-slate-600 hover:border-sky-200 hover:text-sky-700"
                      }`}
                    >
                      {step.title}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => closeGuide(true)}>
                  Hide Tips
                </Button>
                <Button variant="outline" onClick={handleGuideAction}>
                  {currentGuideStep.id === "upload" && !fileMeta ? "Load Sample and Show Me" : "Jump To Feature"}
                </Button>
                <Button
                  onClick={() => {
                    if (guideIndex === guideSteps.length - 1) {
                      closeGuide(true);
                      return;
                    }
                    setGuideIndex((current) => current + 1);
                  }}
                >
                  {guideIndex === guideSteps.length - 1 ? "Finish Guide" : "Next Tip"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <SortMachineWorkbench
        activeSteps={activeSteps}
        error={error}
        notice={notice}
        uploadSectionRef={uploadSectionRef}
        cleanSectionRef={cleanSectionRef}
        columnsSectionRef={columnsSectionRef}
        exportSectionRef={exportSectionRef}
        highlightSection={highlightSection}
        fileMeta={fileMeta}
        status={status}
        handleUpload={handleUpload}
        handleUseSample={handleUseSample}
        sortMachineTemplates={sortMachineTemplates}
        selectedTemplateName={selectedTemplateName}
        setSelectedTemplateName={setSelectedTemplateName}
        selectedTemplate={selectedTemplate}
        columns={columns}
        includeSerialNumber={includeSerialNumber}
        handleToggleSerialNumber={handleToggleSerialNumber}
        handleAddHeading={handleAddHeading}
        handleApplyTemplate={handleApplyTemplate}
        handleResetWorkbench={handleResetWorkbench}
        templateNameInput={templateNameInput}
        setTemplateNameInput={setTemplateNameInput}
        handleSaveTemplate={handleSaveTemplate}
        removedKeywordCount={removedKeywordCount}
        currentSheetLabel={currentSheetLabel}
        selectedColumnsCount={selectedColumnsCount}
        splitTargetLabel={splitTargetLabel}
        splitModeLabel={splitModeLabel}
        config={config}
        setConfig={setConfig}
        keywordInput={keywordInput}
        setKeywordInput={setKeywordInput}
        sheets={sheets}
        sheetName={sheetName}
        handleSheetChange={handleSheetChange}
        headerAnalysis={headerAnalysis}
        preview={quickPreviewRows}
        filters={filters}
        filterOptions={filterOptions}
        activeFilters={activeFilters}
        deletedRowIds={deletedRowIds}
        fullPreviewRows={fullPreviewRows}
        fullPreviewTotalRows={fullPreviewTotalRows}
        fullPreviewHasMore={fullPreviewHasMore}
        visibleFullPreviewColumns={visibleFullPreviewColumns}
        shapedFullPreview={shapedFullPreview}
        handleToggleColumn={handleToggleColumn}
        handleRenameColumn={handleRenameColumn}
        handleFilterChange={handleFilterChange}
        handleAddFilter={handleAddFilter}
        handleRemoveFilter={handleRemoveFilter}
        handleDeleteRow={handleDeleteRow}
        handleResetPreviewEdits={handleResetPreviewEdits}
        handleLoadFullPreview={handleLoadFullPreview}
        openGuide={openGuide}
        resultPreview={resultPreview}
        job={job}
        handleRun={handleRun}
      />
    </div>
  );
}

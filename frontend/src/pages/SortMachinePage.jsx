import { useEffect, useMemo, useState } from "react";
import {
  BookmarkPlus,
  CheckCircle2,
  Download,
  RotateCcw,
  ScanSearch,
  Sparkles,
  WandSparkles,
  Workflow,
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
import { ColumnWorkbench } from "@/components/shared/ColumnWorkbench";
import { LoadingCard } from "@/components/shared/LoadingCard";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { PreviewTable } from "@/components/shared/PreviewTable";
import { UploadDropzone } from "@/components/shared/UploadDropzone";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const initialConfig = {
  trim_spaces: true,
  remove_blank_rows: true,
  standardize_case: "title",
  export_format: "xlsx",
  split_column: "",
  split_export_mode: "none",
};

function humanizeHeader(value) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function createColumnState(columns) {
  return columns.map((column) => ({
    source: column,
    target: humanizeHeader(column),
    selected: true,
  }));
}

function createSortPresetPayload(config, keywordInput, columns) {
  return {
    template_type: "sort_machine_preset",
    type: "Sort Machine Preset",
    category: "Sort Machine",
    description: "Reusable cleaning, column mapping, split, and export setup for repeated sorting jobs.",
    updatedAt: new Date().toISOString().slice(0, 10),
    fields: columns.filter((column) => column.selected).length,
    config,
    keyword_input: keywordInput,
    column_settings: columns.map((column) => ({
      source: column.source,
      target: column.target,
      selected: column.selected,
    })),
  };
}

function applySortPresetToState(preset, currentColumns) {
  const savedColumns = new Map((preset.column_settings || []).map((column) => [column.source, column]));
  const nextColumns = currentColumns.map((column) => {
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

  const nextConfigBase = { ...initialConfig, ...(preset.config || {}) };
  const availableSplitTargets = nextColumns
    .filter((column) => column.selected)
    .map((column) => column.target.trim() || humanizeHeader(column.source));

  return {
    columns: nextColumns,
    config: {
      ...nextConfigBase,
      split_column: availableSplitTargets.includes(nextConfigBase.split_column || "")
        ? nextConfigBase.split_column
        : "",
    },
    keywordInput: preset.keyword_input || "",
  };
}

export function SortMachinePage() {
  const [fileMeta, setFileMeta] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [sheetName, setSheetName] = useState("");
  const [preview, setPreview] = useState([]);
  const [resultPreview, setResultPreview] = useState([]);
  const [columns, setColumns] = useState([]);
  const [headerAnalysis, setHeaderAnalysis] = useState([]);
  const [config, setConfig] = useState(initialConfig);
  const [keywordInput, setKeywordInput] = useState("");
  const [status, setStatus] = useState({
    uploading: false,
    preview: false,
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

  const loadPreview = async (fileId, selectedSheet = "") => {
    setStatus((current) => ({ ...current, preview: true }));
    setError("");
    setNotice("");
    try {
      const resolvedSheet = selectedSheet && selectedSheet !== "csv_data" ? selectedSheet : undefined;
      const data = await getFilePreview(fileId, resolvedSheet);
      setPreview(data.rows);
      setHeaderAnalysis(data.header_analysis || []);
      setResultPreview([]);
      setJob(null);
      setColumns(createColumnState(data.columns));
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

  const handleToggleColumn = (source) => {
    setColumns((current) =>
      current.map((column) => (column.source === source ? { ...column, selected: !column.selected } : column)),
    );
  };

  const handleRenameColumn = (source, target) => {
    setColumns((current) =>
      current.map((column) => (column.source === source ? { ...column, target } : column)),
    );
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

    const resetColumns = createColumnState(columns.map((column) => column.source));
    setConfig(initialConfig);
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
      await saveTemplate(displayName, createSortPresetPayload(config, keywordInput, columns));
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

    const selectedColumns = columns.filter((column) => column.selected);
    const columnMapping = selectedColumns.map((column) => ({
      source: column.source,
      target: column.target.trim() || humanizeHeader(column.source),
    }));

    try {
      const response = await runSortMachine({
        file_id: fileMeta.file_id,
        sheet_name: sheetName && sheetName !== "csv_data" ? sheetName : null,
        export_format: config.export_format,
        split_column: config.split_column || null,
        split_export_mode: config.split_export_mode || "none",
        trim_spaces: config.trim_spaces,
        remove_blank_rows: config.remove_blank_rows,
        standardize_case: config.standardize_case,
        remove_keywords: keywordInput
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        column_mapping: columnMapping,
        export_columns: columnMapping.map((column) => column.target),
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

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Foundation Workbench"
        title="Sort Machine"
        description="Tonight's working foundation lives here: upload, preview, clean, select columns, rename headers, save reusable presets, and export through one premium processing flow."
        actions={
          <>
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

      <section className="grid gap-4 xl:grid-cols-4">
        {activeSteps.map((step) => (
          <Card
            key={step.id}
            className={`relative overflow-hidden ${step.done ? "border-sky-200 bg-sky-50/70" : ""}`}
          >
            <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-white/70 blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{step.id}</p>
                <p className="mt-3 font-display text-xl font-bold text-slate-950">{step.title}</p>
                <p className="mt-2 text-sm text-slate-500">{step.detail}</p>
              </div>
              {step.done ? <CheckCircle2 className="h-5 w-5 text-sky-700" /> : <Workflow className="h-5 w-5 text-slate-400" />}
            </div>
          </Card>
        ))}
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

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-6">
          <UploadDropzone
            title="Upload your academic file"
            subtitle="Drag and drop CSV or Excel workbooks here. The workbench immediately prepares a preview and shared processing state."
            onFileSelect={handleUpload}
            onUseSample={handleUseSample}
            selectedFileName={fileMeta?.filename}
            loading={status.uploading}
          />

          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                <BookmarkPlus className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Reusable Sort Presets</CardTitle>
                <CardDescription className="mt-1">
                  Save the full cleaning, rename, split, and export setup for repeated sorting jobs.
                </CardDescription>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Saved Presets</p>
                <Select
                  value={selectedTemplateName}
                  onChange={(event) => setSelectedTemplateName(event.target.value)}
                  disabled={status.loadingPresets || !sortMachineTemplates.length}
                >
                  <option value="">
                    {status.loadingPresets ? "Loading presets..." : sortMachineTemplates.length ? "Choose a saved preset" : "No saved presets yet"}
                  </option>
                  {sortMachineTemplates.map((template) => (
                    <option key={template.name} value={template.name}>
                      {template.name}
                    </option>
                  ))}
                </Select>
                {selectedTemplate ? (
                  <p className="mt-2 text-xs text-slate-500">
                    {selectedTemplate.fields || 0} selected fields | updated {selectedTemplate.updatedAt || "recently"}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Button variant="outline" onClick={handleApplyTemplate} disabled={!selectedTemplateName || !columns.length}>
                  Apply Preset
                </Button>
                <Button variant="outline" onClick={handleResetWorkbench} disabled={!columns.length}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset Setup
                </Button>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-white/75 p-4">
                <p className="mb-2 text-sm font-semibold text-slate-700">Save Current Setup As</p>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <Input
                    value={templateNameInput}
                    onChange={(event) => setTemplateNameInput(event.target.value)}
                    placeholder="Example: Faculty split and cleanup"
                  />
                  <Button onClick={handleSaveTemplate} disabled={status.savingPreset || !columns.length}>
                    {status.savingPreset ? "Saving..." : "Save Preset"}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Presets capture cleaning rules, keywords, column keep/drop choices, renamed headings, and split export settings.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-teal-100 p-3 text-teal-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Cleaning Rules</CardTitle>
                <CardDescription className="mt-1">
                  Basic rules are ready tonight: trim spaces, drop blank rows, normalize case, and remove flagged keywords.
                </CardDescription>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-white/75 px-4 py-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.trim_spaces}
                    onChange={(event) => setConfig((current) => ({ ...current, trim_spaces: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Trim extra spaces
                </label>
                <label className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-white/75 px-4 py-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.remove_blank_rows}
                    onChange={(event) => setConfig((current) => ({ ...current, remove_blank_rows: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Remove blank rows
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Case Standardization</p>
                  <Select
                    value={config.standardize_case}
                    onChange={(event) => setConfig((current) => ({ ...current, standardize_case: event.target.value }))}
                  >
                    <option value="none">Keep Original</option>
                    <option value="title">Title Case</option>
                    <option value="upper">UPPERCASE</option>
                    <option value="lower">lowercase</option>
                  </Select>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Export Format</p>
                  <Select
                    value={config.export_format}
                    onChange={(event) => setConfig((current) => ({ ...current, export_format: event.target.value }))}
                  >
                    <option value="xlsx">XLSX</option>
                    <option value="csv">CSV</option>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Split Output By</p>
                  <Select
                    value={config.split_column || ""}
                    onChange={(event) => setConfig((current) => ({ ...current, split_column: event.target.value }))}
                  >
                    <option value="">Do not split</option>
                    {columns
                      .filter((column) => column.selected)
                      .map((column) => (
                        <option key={column.target} value={column.target.trim() || humanizeHeader(column.source)}>
                          {column.target.trim() || humanizeHeader(column.source)}
                        </option>
                      ))}
                  </Select>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Split Export Mode</p>
                  <Select
                    value={config.split_export_mode || "none"}
                    onChange={(event) => setConfig((current) => ({ ...current, split_export_mode: event.target.value }))}
                  >
                    <option value="none">Single Output</option>
                    <option value="separate_sheets">Separate Sheets</option>
                    <option value="zipped_files">Zipped Files</option>
                  </Select>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Remove Rows Containing Keywords</p>
                <Input
                  value={keywordInput}
                  onChange={(event) => setKeywordInput(event.target.value)}
                  placeholder="example: cancelled, duplicate, absent"
                />
              </div>

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
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {status.preview ? <LoadingCard title="Building preview and detecting columns..." /> : null}

          {!status.preview && headerAnalysis.length ? (
            <Card>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                  <ScanSearch className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Messy Header Detection</CardTitle>
                  <CardDescription className="mt-1">
                    The backend normalizes rough spreadsheet headers and shows what changed.
                  </CardDescription>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {headerAnalysis.map((header) => (
                  <div
                    key={`${header.original}-${header.normalized}`}
                    className={`grid gap-3 rounded-[20px] border p-4 md:grid-cols-[1fr_auto_1fr] ${
                      header.changed ? "border-amber-200 bg-amber-50/80" : "border-slate-200 bg-white/75"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Original</p>
                      <p className="mt-2 text-sm font-medium text-slate-700">{header.original}</p>
                    </div>
                    <div className="flex items-center justify-center text-sm font-semibold text-slate-400">-&gt;</div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Normalized</p>
                      <p className="mt-2 text-sm font-medium text-slate-900">{header.normalized}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {!status.preview && columns.length ? (
            <ColumnWorkbench columns={columns} onToggle={handleToggleColumn} onRename={handleRenameColumn} />
          ) : null}

          {!status.preview && preview.length ? (
            <PreviewTable
              title="Source Preview"
              description="Smooth preview of the uploaded academic dataset before transformation."
              data={preview}
            />
          ) : null}

          {status.processing ? <LoadingCard title="Applying cleaning rules and writing export..." /> : null}

          {resultPreview.length ? (
            <PreviewTable
              title="Processed Preview"
              description="Final transformed output based on the active cleaning and column rules."
              data={resultPreview}
            />
          ) : null}

          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Export Stage</CardTitle>
                <CardDescription className="mt-1">
                  Run the workbench once the preview, cleaning rules, final headers, and reusable preset look right.
                </CardDescription>
              </div>
              <div className="rounded-2xl bg-slate-950 p-3 text-white">
                <WandSparkles className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200 bg-white/75 p-4">
                <p className="text-sm text-slate-500">Selected columns</p>
                <p className="mt-2 font-display text-3xl font-bold text-slate-950">
                  {columns.filter((column) => column.selected).length}
                </p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-white/75 p-4">
                <p className="text-sm text-slate-500">Output format</p>
                <p className="mt-2 font-display text-3xl font-bold uppercase text-slate-950">
                  {config.export_format}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={handleRun} disabled={!fileMeta || status.processing}>
                {status.processing ? "Processing..." : "Generate Export"}
              </Button>
              {job ? (
                <a href={buildDownloadUrl(job.id)}>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download {job.format}
                  </Button>
                </a>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

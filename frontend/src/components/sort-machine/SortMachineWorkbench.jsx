import {
  BookmarkPlus,
  CheckCircle2,
  Download,
  Filter,
  RotateCcw,
  ScanSearch,
  Sparkles,
  UploadCloud,
  WandSparkles,
  Workflow,
} from "lucide-react";
import { buildDownloadUrl } from "@/lib/api";
import { ColumnWorkbench } from "@/components/shared/ColumnWorkbench";
import { LoadingCard } from "@/components/shared/LoadingCard";
import { PreviewTable } from "@/components/shared/PreviewTable";
import { UploadDropzone } from "@/components/shared/UploadDropzone";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function SortMachineWorkbench({
  activeSteps,
  error,
  notice,
  uploadSectionRef,
  cleanSectionRef,
  columnsSectionRef,
  exportSectionRef,
  highlightSection,
  fileMeta,
  status,
  handleUpload,
  handleUseSample,
  sortMachineTemplates,
  selectedTemplateName,
  setSelectedTemplateName,
  selectedTemplate,
  columns,
  includeSerialNumber,
  handleToggleSerialNumber,
  handleAddHeading,
  handleApplyTemplate,
  handleResetWorkbench,
  templateNameInput,
  setTemplateNameInput,
  handleSaveTemplate,
  removedKeywordCount,
  currentSheetLabel,
  selectedColumnsCount,
  splitTargetLabel,
  splitModeLabel,
  config,
  setConfig,
  keywordInput,
  setKeywordInput,
  sheets,
  sheetName,
  handleSheetChange,
  headerAnalysis,
  preview,
  filters,
  filterOptions,
  activeFilters,
  deletedRowIds,
  fullPreviewRows,
  fullPreviewTotalRows,
  fullPreviewHasMore,
  visibleFullPreviewColumns,
  shapedFullPreview,
  handleToggleColumn,
  handleRenameColumn,
  handleFilterChange,
  handleAddFilter,
  handleRemoveFilter,
  handleDeleteRow,
  handleResetPreviewEdits,
  handleLoadFullPreview,
  openGuide,
  resultPreview,
  job,
  handleRun,
}) {
  const changedHeaders = headerAnalysis.filter((header) => header.changed);

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-4">
        {activeSteps.map((step) => (
          <Card
            key={step.id}
            className={`relative overflow-hidden border-slate-200/90 bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(248,250,252,0.94))] ${
              step.done ? "border-sky-200 bg-sky-50/70" : ""
            }`}
          >
            <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-white/70 blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{step.id}</p>
                <p className="mt-3 font-display text-xl font-bold text-slate-950">{step.title}</p>
                <p className="mt-2 text-sm text-slate-500">{step.detail}</p>
              </div>
              {step.done ? (
                <CheckCircle2 className="h-5 w-5 text-sky-700" />
              ) : (
                <Workflow className="h-5 w-5 text-slate-400" />
              )}
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

      <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <div ref={uploadSectionRef} className={highlightSection("upload")}>
          <UploadDropzone
            title="Upload your academic file"
            subtitle="Drag and drop CSV or Excel workbooks here. The workbench immediately prepares a preview, detects headings, and unlocks the full processing flow."
            onFileSelect={handleUpload}
            onUseSample={handleUseSample}
            selectedFileName={fileMeta?.filename}
            loading={status.uploading}
            compact={Boolean(fileMeta)}
          />
        </div>

        <Card className="border-slate-200/90 bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(248,250,252,0.94))]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                <BookmarkPlus className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Reusable Sort Presets</CardTitle>
                <CardDescription className="mt-1">
                  Save the full cleaning, column mapping, and split setup for repeated sorting jobs.
                </CardDescription>
              </div>
            </div>
            <div className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {sortMachineTemplates.length} presets
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
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
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white/85 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-700">Save Current Setup As</p>
              <div className="grid gap-3">
                <Input
                  value={templateNameInput}
                  onChange={(event) => setTemplateNameInput(event.target.value)}
                  placeholder="Example: Faculty split and cleanup"
                />
                <Button onClick={handleSaveTemplate} disabled={status.savingPreset || !columns.length}>
                  {status.savingPreset ? "Saving..." : "Save Preset"}
                </Button>
              </div>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                Presets capture cleaning rules, keywords, column keep/drop choices, renamed headings, and split export settings.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <div ref={cleanSectionRef} className={highlightSection("clean")}>
        <Card className="border-slate-200/90 bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(248,250,252,0.94))]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-teal-100 p-3 text-teal-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Cleaning Rules + Export Controls</CardTitle>
                <CardDescription className="mt-1">
                  Trim spaces, drop blank rows, standardize case, remove flagged keywords, and choose how the processed sheet should be exported.
                </CardDescription>
              </div>
            </div>
            <div className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {removedKeywordCount} keyword filters
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Sheet</p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-950">{currentSheetLabel}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Selected Columns</p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-950">{selectedColumnsCount}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Split Target</p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-950">{splitTargetLabel}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Export Mode</p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-950">{splitModeLabel}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-white/80 px-4 py-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.trim_spaces}
                    onChange={(event) => setConfig((current) => ({ ...current, trim_spaces: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Trim extra spaces
                </label>
                <label className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-white/80 px-4 py-4 text-sm text-slate-700">
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

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Remove Rows Containing Keywords</p>
                <Input
                  value={keywordInput}
                  onChange={(event) => setKeywordInput(event.target.value)}
                  placeholder="example: cancelled, duplicate, absent"
                />
              </div>

              <div className="rounded-[22px] border border-teal-100 bg-teal-50/55 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Data Filter</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Keep only the rows you want before export, like a simple Excel filter.
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleAddFilter} disabled={!filterOptions.length}>
                    Add Filter
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  {filters.map((filter, index) => (
                    <div key={filter.id} className="rounded-[18px] border border-white/80 bg-white/80 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Filter {index + 1}</p>
                        <Button variant="ghost" onClick={() => handleRemoveFilter(filter.id)}>
                          Remove
                        </Button>
                      </div>
                      <div className="mt-3 grid gap-3 lg:grid-cols-[1.05fr_0.85fr_1.2fr]">
                        <Select value={filter.column} onChange={(event) => handleFilterChange(filter.id, "column", event.target.value)}>
                          <option value="">Select column</option>
                          {filterOptions.map((option) => (
                            <option key={`${filter.id}-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                        <Select value={filter.operator} onChange={(event) => handleFilterChange(filter.id, "operator", event.target.value)}>
                          <option value="equals">Equals</option>
                          <option value="contains">Contains</option>
                          <option value="not_contains">Does Not Contain</option>
                          <option value="one_of">One Of</option>
                          <option value="starts_with_one_of">Starts With One Of</option>
                          <option value="max_digits">Max Digits</option>
                        </Select>
                        <Input
                          value={filter.value}
                          onChange={(event) => handleFilterChange(filter.id, "value", event.target.value)}
                          placeholder="Enter filter value"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[22px] border border-slate-200 bg-white/85 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                    <Filter className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Simple Sort</p>
                    <p className="mt-1 text-xs text-slate-500">Like normal Excel sort: pick a field and choose ascending or descending.</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  <Select
                    value={config.sort_by || ""}
                    onChange={(event) => setConfig((current) => ({ ...current, sort_by: event.target.value }))}
                  >
                    <option value="">No sorting</option>
                    {filterOptions.map((option) => (
                      <option key={`sort-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={config.sort_direction || "asc"}
                    onChange={(event) => setConfig((current) => ({ ...current, sort_direction: event.target.value }))}
                    disabled={!config.sort_by}
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </Select>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Split Output By</p>
                <Select
                  value={config.split_column || ""}
                  onChange={(event) => setConfig((current) => ({ ...current, split_column: event.target.value }))}
                >
                  <option value="">Do not split</option>
                  {columns
                    .filter((column) => column.selected && column.kind === "source")
                    .map((column) => (
                      <option key={column.id} value={column.target.trim() || column.target}>
                        {column.target.trim() || column.target}
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
          </div>
        </Card>
      </div>

      {status.preview ? <LoadingCard title="Building preview and detecting columns..." /> : null}

      {!status.preview && changedHeaders.length ? (
        <Card className="border-amber-200 bg-[linear-gradient(145deg,rgba(255,251,235,0.88),rgba(255,255,255,0.96))]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <ScanSearch className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Header Notes</CardTitle>
                <CardDescription className="mt-1">
                  Sort Machine can normalize rough headings, but this is only a support note. The real editing happens in the column board below.
                </CardDescription>
              </div>
            </div>
            <div className="rounded-full border border-amber-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              {changedHeaders.length} normalized
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {changedHeaders.map((header) => (
              <div key={`${header.original}-${header.normalized}`} className="rounded-[20px] border border-amber-200 bg-white/88 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Original</p>
                <p className="mt-2 text-sm font-medium text-slate-700">{header.original}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Using</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{header.normalized}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {!status.preview && preview.length ? (
        <PreviewTable
          title="Quick Clean Preview"
          description="A fast sample view of the active clean-up result after filters, row removals, sorting, and column keep/drop choices."
          data={preview}
          maxHeightClass="max-h-[420px] xl:max-h-[48vh]"
        />
      ) : null}

      <div ref={columnsSectionRef} className={highlightSection("columns")}>
        {!status.preview && columns.length ? (
          <ColumnWorkbench
            columns={columns}
            includeSerialNumber={includeSerialNumber}
            onToggleSerialNumber={handleToggleSerialNumber}
            onAddHeading={handleAddHeading}
            onToggle={handleToggleColumn}
            onRename={handleRenameColumn}
          />
        ) : null}

        {!status.preview && !columns.length ? (
          <Card className="border border-sky-200 bg-sky-50/70">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-white p-3 text-sky-700 shadow-sm">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <CardTitle>Editing unlocks after upload</CardTitle>
                <CardDescription className="mt-2 leading-6">
                  No dataset has been loaded into Sort Machine yet. Upload a file or use the sample dataset to unlock header detection, source preview, cleanup, column shaping, and export.
                </CardDescription>
                <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                  <div className="rounded-[20px] border border-sky-100 bg-white/80 px-4 py-3">
                    Header detection and source preview
                  </div>
                  <div className="rounded-[20px] border border-sky-100 bg-white/80 px-4 py-3">
                    Column keep/drop and heading rename
                  </div>
                  <div className="rounded-[20px] border border-sky-100 bg-white/80 px-4 py-3">
                    Cleanup rules and keyword removal
                  </div>
                  <div className="rounded-[20px] border border-sky-100 bg-white/80 px-4 py-3">
                    Split export and download controls
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button onClick={handleUseSample} disabled={status.uploading}>
                    {status.uploading ? "Loading..." : "Load Sample Dataset"}
                  </Button>
                  <Button variant="outline" onClick={() => openGuide("upload")}>
                    Show Me How It Works
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ) : null}
      </div>

      {status.processing ? <LoadingCard title="Applying cleaning rules and writing export..." /> : null}

      <Card className="border-slate-200/90 bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(248,250,252,0.94))]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Complete Cleaning Preview</CardTitle>
            <CardDescription className="mt-1">
              Work in filtered batches here. Load the cleaned rows, drop what you do not want, then export from that state.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleResetPreviewEdits}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Removed Rows
            </Button>
            <Button variant="outline" onClick={() => handleLoadFullPreview(false)} disabled={!fileMeta || status.fullPreview}>
              {status.fullPreview ? "Loading..." : fullPreviewRows.length ? "Reload First Batch" : "Open Workbench"}
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
            <p className="mt-2 font-display text-2xl font-bold text-slate-950">{fullPreviewRows.length ? fullPreviewTotalRows : preview.length}</p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Active Filters</p>
            <p className="mt-2 font-display text-2xl font-bold text-slate-950">{activeFilters.length}</p>
          </div>
        </div>

        {!fullPreviewRows.length ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 px-5 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">Open the cleaning preview to start dropping rows from the filtered dataset.</p>
            <p className="mt-2 text-sm text-slate-500">This loads the first cleaned batch only, then you can bring in more rows when needed.</p>
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white/90">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <div className="flex flex-wrap items-center gap-2">
                <span>{shapedFullPreview.length} visible rows</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                  {fullPreviewHasMore ? "More rows available" : "Current clean set fully loaded"}
                </span>
              </div>
              <span>{activeFilters.length ? `${activeFilters.length} active filters` : "No filters applied"}</span>
            </div>

            <div className="max-h-[420px] xl:max-h-[48vh] overflow-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                  <tr>
                    <th className="w-28 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Row</th>
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

      {resultPreview.length ? (
        <PreviewTable
          title="Processed Preview"
          description="Final transformed output based on the active cleaning, split, and column rules."
          data={resultPreview}
          maxHeightClass="max-h-[420px] xl:max-h-[48vh]"
        />
      ) : null}

      <div ref={exportSectionRef} className={highlightSection("export")}>
        <Card className="border-slate-200/90 bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(248,250,252,0.94))]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Export Stage</CardTitle>
              <CardDescription className="mt-1">
                Run the workbench once the source preview, cleaning rules, final headers, and reusable preset look right.
              </CardDescription>
            </div>
            <div className="rounded-2xl bg-slate-950 p-3 text-white">
              <WandSparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-white/80 p-4">
              <p className="text-sm text-slate-500">Selected columns</p>
              <p className="mt-2 font-display text-3xl font-bold text-slate-950">{selectedColumnsCount}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/80 p-4">
              <p className="text-sm text-slate-500">Output format</p>
              <p className="mt-2 font-display text-3xl font-bold uppercase text-slate-950">{config.export_format}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/80 p-4">
              <p className="text-sm text-slate-500">Split target</p>
              <p className="mt-2 font-display text-3xl font-bold text-slate-950">{splitTargetLabel}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/80 p-4">
              <p className="text-sm text-slate-500">Export status</p>
              <p className="mt-2 font-display text-3xl font-bold text-slate-950">{job ? "Ready" : "Waiting"}</p>
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
    </>
  );
}

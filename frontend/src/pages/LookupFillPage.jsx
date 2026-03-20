import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  CheckCheck,
  Download,
  FileStack,
  Link2,
  Plus,
  RefreshCcw,
  WandSparkles,
} from "lucide-react";
import {
  buildDownloadUrl,
  getFilePreview,
  getFileSheets,
  runLookupFill,
  uploadFile,
} from "@/lib/api";
import { LoadingCard } from "@/components/shared/LoadingCard";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { PreviewTable } from "@/components/shared/PreviewTable";
import { UploadDropzone } from "@/components/shared/UploadDropzone";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const LOOKUP_BATCH_SIZE = 10;

const FIELD_ALIAS_GROUPS = [
  ["sex", "gender"],
  ["matricno", "matric_no", "matric_number", "matriculation_number"],
  ["jambregno", "jamb_reg_no", "jamb_reg_number", "jamb_registration_number"],
  ["surname", "last_name", "family_name"],
  ["firstname", "first_name"],
  ["middlename", "middle_name"],
  ["gsmno", "phone_number", "mobile_number", "gsm_number"],
  ["stateoforigin", "state_of_origin"],
  ["courseofstudy", "course_of_study", "programme", "programme_of_study", "course"],
];

const createLookupMapping = (overrides = {}) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  source: "",
  target: "",
  mode: "fill_blank",
  ...overrides,
});

function normalizeLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getEquivalentLabels(value) {
  const normalizedValue = normalizeLabel(value);
  const match = FIELD_ALIAS_GROUPS.find((group) => group.includes(normalizedValue));
  return match || [normalizedValue];
}

function buildSuggestedMappings(primaryColumns, lookupColumns) {
  const primaryLookup = new Map(primaryColumns.map((column) => [normalizeLabel(column), column]));

  const suggestions = lookupColumns
    .map((lookupColumn) => {
      const aliases = getEquivalentLabels(lookupColumn);
      const target =
        aliases.map((alias) => primaryLookup.get(alias)).find(Boolean) ||
        primaryColumns.find((column) => {
          const normalizedColumn = normalizeLabel(column);
          return aliases.some(
            (alias) => normalizedColumn.includes(alias) || alias.includes(normalizedColumn),
          );
        }) ||
        "";

      if (!target) {
        return null;
      }

      return createLookupMapping({
        source: lookupColumn,
        target,
        mode: "fill_blank",
      });
    })
    .filter(Boolean);

  return suggestions;
}

function suggestKey(columns) {
  return (
    columns.find((column) =>
      [
        "matric_no",
        "matric_number",
        "matriculation_number",
        "student_id",
        "application_number",
        "jamb_reg_no",
      ].includes(column),
    ) || columns[0] || ""
  );
}

async function hydrateTabularFile(meta) {
  const sheetPayload = await getFileSheets(meta.file_id);
  const sheets = sheetPayload.sheets || [];
  const primarySheet = sheets[0] || "";
  const previewPayload = await getFilePreview(
    meta.file_id,
    primarySheet && primarySheet !== "csv_data" ? primarySheet : undefined,
    { limit: LOOKUP_BATCH_SIZE },
  );

  return {
    ...meta,
    sheets,
    sheetName: primarySheet,
    columns: previewPayload.columns || [],
    preview: previewPayload.rows || [],
    totalRows: previewPayload.total_rows || 0,
  };
}

export function LookupFillPage() {
  const [primaryMeta, setPrimaryMeta] = useState(null);
  const [lookupMeta, setLookupMeta] = useState(null);
  const [primaryKey, setPrimaryKey] = useState("");
  const [lookupKey, setLookupKey] = useState("");
  const [mappings, setMappings] = useState([]);
  const [mappingTouched, setMappingTouched] = useState(false);
  const [outputName, setOutputName] = useState("lookup_fill_output");
  const [status, setStatus] = useState({
    primaryUpload: false,
    lookupUpload: false,
    refreshing: false,
    running: false,
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState(null);

  const primaryColumns = primaryMeta?.columns || [];
  const lookupColumns = lookupMeta?.columns || [];
  const mappedCount = useMemo(
    () => mappings.filter((mapping) => mapping.source.trim() && mapping.target.trim()).length,
    [mappings],
  );

  useEffect(() => {
    if (!primaryKey && primaryColumns.length) {
      setPrimaryKey(suggestKey(primaryColumns));
    }
  }, [primaryColumns, primaryKey]);

  useEffect(() => {
    if (!lookupKey && lookupColumns.length) {
      setLookupKey(suggestKey(lookupColumns));
    }
  }, [lookupColumns, lookupKey]);

  useEffect(() => {
    if (!primaryColumns.length || !lookupColumns.length || mappingTouched) {
      return;
    }

    const suggestions = buildSuggestedMappings(primaryColumns, lookupColumns);
    setMappings(suggestions.length ? suggestions : [createLookupMapping()]);
  }, [lookupColumns, mappingTouched, primaryColumns]);

  const handleUpload = async (position, file) => {
    const loadingKey = position === "primary" ? "primaryUpload" : "lookupUpload";
    setStatus((current) => ({ ...current, [loadingKey]: true }));
    setError("");
    setNotice("");

    try {
      const meta = await uploadFile(file);
      const hydrated = await hydrateTabularFile(meta);
      if (position === "primary") {
        setPrimaryMeta(hydrated);
        setPrimaryKey("");
        setNotice(`${meta.filename} loaded as the main sheet to be filled.`);
      } else {
        setLookupMeta(hydrated);
        setLookupKey("");
        setNotice(`${meta.filename} loaded as the second lookup sheet.`);
      }
      setMappingTouched(false);
      setResult(null);
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, [loadingKey]: false }));
    }
  };

  const handleSheetChange = async (position, nextSheetName) => {
    const currentMeta = position === "primary" ? primaryMeta : lookupMeta;
    if (!currentMeta) {
      return;
    }

    setStatus((current) => ({ ...current, refreshing: true }));
    setError("");

    try {
      const previewPayload = await getFilePreview(
        currentMeta.file_id,
        nextSheetName && nextSheetName !== "csv_data" ? nextSheetName : undefined,
        { limit: LOOKUP_BATCH_SIZE },
      );

      const nextMeta = {
        ...currentMeta,
        sheetName: nextSheetName,
        columns: previewPayload.columns || [],
        preview: previewPayload.rows || [],
        totalRows: previewPayload.total_rows || 0,
      };

      if (position === "primary") {
        setPrimaryMeta(nextMeta);
        setPrimaryKey("");
      } else {
        setLookupMeta(nextMeta);
        setLookupKey("");
      }

      setMappingTouched(false);
      setResult(null);
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, refreshing: false }));
    }
  };

  const handleAddMapping = () => {
    setMappingTouched(true);
    setMappings((current) => [...current, createLookupMapping()]);
  };

  const handleMappingChange = (id, field, value) => {
    setMappingTouched(true);
    setMappings((current) =>
      current.map((mapping) => (mapping.id === id ? { ...mapping, [field]: value } : mapping)),
    );
  };

  const handleRemoveMapping = (id) => {
    setMappingTouched(true);
    setMappings((current) => {
      const nextMappings = current.filter((mapping) => mapping.id !== id);
      return nextMappings.length ? nextMappings : [createLookupMapping()];
    });
  };

  const handleResetSuggestions = () => {
    const suggestions = buildSuggestedMappings(primaryColumns, lookupColumns);
    setMappingTouched(false);
    setMappings(suggestions.length ? suggestions : [createLookupMapping()]);
    setNotice("Lookup suggestions refreshed from the current main and second file headings.");
  };

  const handleRun = async () => {
    if (!primaryMeta || !lookupMeta) {
      setError("Upload both the main file and the second lookup file.");
      return;
    }

    if (!primaryKey || !lookupKey) {
      setError("Pick the unique key column on both sides before running.");
      return;
    }

    const cleanedMappings = mappings
      .filter((mapping) => mapping.source.trim() && mapping.target.trim())
      .map(({ source, target, mode }) => ({
        source: source.trim(),
        target: target.trim(),
        mode,
      }));

    if (!cleanedMappings.length) {
      setError("Add at least one fill mapping first.");
      return;
    }

    setStatus((current) => ({ ...current, running: true }));
    setError("");
    setNotice("");

    try {
      const response = await runLookupFill({
        primary_file_id: primaryMeta.file_id,
        lookup_file_id: lookupMeta.file_id,
        primary_sheet_name:
          primaryMeta.sheetName && primaryMeta.sheetName !== "csv_data" ? primaryMeta.sheetName : null,
        lookup_sheet_name:
          lookupMeta.sheetName && lookupMeta.sheetName !== "csv_data" ? lookupMeta.sheetName : null,
        primary_key: primaryKey,
        lookup_key: lookupKey,
        mappings: cleanedMappings,
        output_name: outputName.trim() || "lookup_fill_output",
      });

      setResult(response);
      setNotice("VLOOKUP Fill completed. Review the enriched preview and download the workbook.");
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, running: false }));
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Module 03"
        title="VLOOKUP Fill"
        description="Fill columns in your main sheet from a second Excel or CSV file using a shared unique key like matric number, application number, or JAMB registration number."
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleResetSuggestions}
              disabled={!primaryColumns.length || !lookupColumns.length}
            >
              <WandSparkles className="mr-2 h-4 w-4" />
              Refresh Suggestions
            </Button>
            <Button onClick={handleRun} disabled={!primaryMeta || !lookupMeta || status.running}>
              {status.running ? "Running..." : "Run VLOOKUP Fill"}
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

      {error ? (
        <Card className="border border-rose-200 bg-rose-50/90">
          <p className="text-sm font-medium text-rose-700">{error}</p>
        </Card>
      ) : null}

      {!error && notice ? (
        <Card className="border border-emerald-200 bg-emerald-50/90">
          <p className="text-sm font-medium text-emerald-700">{notice}</p>
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-4">
        {[
          { label: "Main Rows", value: primaryMeta?.totalRows || 0, icon: FileStack },
          { label: "Lookup Rows", value: lookupMeta?.totalRows || 0, icon: ArrowRightLeft },
          { label: "Main Fields", value: primaryColumns.length, icon: Link2 },
          { label: "Mapped Fills", value: mappedCount, icon: CheckCheck },
        ].map((item) => (
          <Card key={item.label} className="overflow-hidden border-slate-200 bg-[linear-gradient(140deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                <p className="mt-3 font-display text-2xl font-bold text-slate-950">{item.value}</p>
              </div>
              <div className="rounded-2xl bg-slate-950 p-3 text-white">
                <item.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <UploadDropzone
            title="Upload main sheet"
            subtitle="This is the base file you want to enrich. The final export will keep this sheet and fill chosen columns from the second file."
            onFileSelect={(file) => handleUpload("primary", file)}
            selectedFileName={primaryMeta?.filename}
            loading={status.primaryUpload}
            showSampleAction={false}
            selectLabel="Upload Main File"
          />

          <UploadDropzone
            title="Upload second lookup sheet"
            subtitle="This is the second Excel or CSV file that holds the values you want to pull into the main sheet."
            onFileSelect={(file) => handleUpload("lookup", file)}
            selectedFileName={lookupMeta?.filename}
            loading={status.lookupUpload}
            showSampleAction={false}
            selectLabel="Upload Lookup File"
            compact
          />

          <Card className="border-sky-100 bg-white/90">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Lookup Controls</CardTitle>
                <CardDescription className="mt-1">
                  Choose the unique key on both files, then define which columns should be pulled from the second file.
                </CardDescription>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Main Sheet Key</p>
                <Select value={primaryKey} onChange={(event) => setPrimaryKey(event.target.value)} disabled={!primaryColumns.length}>
                  <option value="">{primaryColumns.length ? "Choose main key" : "Upload the main file first"}</option>
                  {primaryColumns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Second File Key</p>
                <Select value={lookupKey} onChange={(event) => setLookupKey(event.target.value)} disabled={!lookupColumns.length}>
                  <option value="">{lookupColumns.length ? "Choose lookup key" : "Upload the second file first"}</option>
                  {lookupColumns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Output Name</p>
                <Input value={outputName} onChange={(event) => setOutputName(event.target.value)} placeholder="lookup_fill_output" />
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Quick Read</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Main sheet stays in front. Matching happens on the chosen keys. Filled values come from the second file.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {primaryMeta?.sheets?.length > 1 ? (
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Main Sheet Tab</p>
                  <Select
                    value={primaryMeta.sheetName}
                    onChange={(event) => handleSheetChange("primary", event.target.value)}
                    disabled={status.refreshing}
                  >
                    {primaryMeta.sheets.map((sheet) => (
                      <option key={`primary-${sheet}`} value={sheet}>
                        {sheet}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}

              {lookupMeta?.sheets?.length > 1 ? (
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Lookup Sheet Tab</p>
                  <Select
                    value={lookupMeta.sheetName}
                    onChange={(event) => handleSheetChange("lookup", event.target.value)}
                    disabled={status.refreshing}
                  >
                    {lookupMeta.sheets.map((sheet) => (
                      <option key={`lookup-${sheet}`} value={sheet}>
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
          <Card className="px-0 py-0">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Fill Mapping Studio</CardTitle>
                <CardDescription className="mt-1">
                  Tell the system which column to pull from the second file and which column in the main file should receive it.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleAddMapping}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Fill Column
                </Button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {mappings.map((mapping, index) => (
                <div key={mapping.id} className="grid gap-4 px-6 py-4 lg:grid-cols-[1fr_1fr_180px_auto] lg:items-end">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">From Second File</p>
                    <Select
                      value={mapping.source}
                      onChange={(event) => handleMappingChange(mapping.id, "source", event.target.value)}
                      disabled={!lookupColumns.length}
                    >
                      <option value="">{lookupColumns.length ? "Choose source column" : "Upload lookup file first"}</option>
                      {lookupColumns.map((column) => (
                        <option key={`${mapping.id}-${column}`} value={column}>
                          {column}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Write Into Main Column</p>
                    <Input
                      value={mapping.target}
                      onChange={(event) => handleMappingChange(mapping.id, "target", event.target.value)}
                      placeholder={primaryColumns[index] || "Type target column name"}
                    />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Fill Mode</p>
                    <Select value={mapping.mode} onChange={(event) => handleMappingChange(mapping.id, "mode", event.target.value)}>
                      <option value="fill_blank">Fill Blank Only</option>
                      <option value="replace">Replace Value</option>
                    </Select>
                  </div>

                  <Button
                    variant="outline"
                    className="border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                    onClick={() => handleRemoveMapping(mapping.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {primaryMeta?.preview?.length ? (
            <PreviewTable
              title="Main Sheet Preview"
              description="The base file that will be enriched with values from the second file."
              data={primaryMeta.preview}
            />
          ) : null}

          {lookupMeta?.preview?.length ? (
            <PreviewTable
              title="Second File Preview"
              description="The source of values to be pulled into the main sheet."
              data={lookupMeta.preview}
            />
          ) : null}

          {result?.preview?.length ? (
            <PreviewTable
              title="Filled Output Preview"
              description="Preview the enriched sheet before download."
              data={result.preview}
            />
          ) : null}

          <Card className="border-slate-200 bg-white/90">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Export</CardTitle>
                <CardDescription className="mt-1">
                  Run the lookup to generate the filled workbook, audit sheet, and unmatched rows sheet.
                </CardDescription>
              </div>
              <Button onClick={handleRun} disabled={!primaryMeta || !lookupMeta || status.running}>
                {status.running ? "Running..." : "Generate Workbook"}
              </Button>
            </div>

            {status.running ? <LoadingCard title="Matching keys, filling columns, and writing the export workbook..." /> : null}

            {result?.audit?.length ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {result.audit.map((item) => (
                  <div key={item.metric} className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {String(item.metric).replace(/_/g, " ")}
                    </p>
                    <p className="mt-2 font-display text-2xl font-bold text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {result?.job ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <a href={buildDownloadUrl(result.job.id)}>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download {result.job.file}
                  </Button>
                </a>
                <Button variant="outline" onClick={handleRun}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Re-run Lookup
                </Button>
              </div>
            ) : null}
          </Card>
        </div>
      </section>
    </div>
  );
}

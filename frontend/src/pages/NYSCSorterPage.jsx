import { useEffect, useMemo, useState } from "react";
import {
  CheckCheck,
  Download,
  FileStack,
  Link2,
  Plus,
  RefreshCcw,
  Trash2,
  WandSparkles,
} from "lucide-react";
import {
  buildDownloadUrl,
  getFilePreview,
  getFileSheets,
  getFileStructure,
  runRecordSorter,
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

function normalizeLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const FIELD_ALIAS_GROUPS = [
  ["sex", "gender"],
  ["matricno", "matric_no", "matric_number", "matriculation_number"],
  ["firstname", "first_name"],
  ["middlename", "middle_name"],
  ["surname", "last_name", "family_name"],
  ["gsmno", "gsm_number", "phone_number", "mobile_number"],
  ["stateoforigin", "state_of_origin"],
  ["classofdegree", "class_of_degree"],
  ["dateofbirth", "date_of_birth"],
  ["dateofgraduation", "date_of_graduation"],
  ["maritalstatus", "marital_status"],
  ["jambregno", "jamb_reg_no", "jamb_reg_number", "jamb_registration_number"],
  ["courseofstudy", "course_of_study", "programme", "programme_of_study", "course"],
  ["studymode", "study_mode", "mode_of_study"],
  ["ismilitary", "is_military", "military_status"],
  ["nameofstudent", "name_of_student", "student_name"],
];

function getEquivalentLabels(value) {
  const normalizedValue = normalizeLabel(value);
  const matches = FIELD_ALIAS_GROUPS.find((group) => group.includes(normalizedValue));
  return matches || [normalizedValue];
}

function buildAutoMappings(targetFields, sourceColumns) {
  const normalizedSourceLookup = new Map(sourceColumns.map((column) => [normalizeLabel(column), column]));

  return targetFields.map((targetField) => {
    const normalizedTarget = normalizeLabel(targetField);
    const equivalents = getEquivalentLabels(normalizedTarget);
    let suggestedSource = equivalents.map((label) => normalizedSourceLookup.get(label)).find(Boolean) || "";

    if (!suggestedSource) {
      suggestedSource =
        sourceColumns.find((column) => {
          const normalizedSource = normalizeLabel(column);
          return equivalents.some(
            (candidate) => normalizedSource.includes(candidate) || candidate.includes(normalizedSource),
          );
        }) || "";
    }

    return {
      target: targetField,
      source: suggestedSource,
    };
  });
}

async function hydrateSourceFile(meta) {
  const sheetPayload = await getFileSheets(meta.file_id);
  const sheets = sheetPayload.sheets || [];
  const primarySheet = sheets[0] || "";
  const [previewPayload, structurePayload] = await Promise.all([
    getFilePreview(meta.file_id, primarySheet && primarySheet !== "csv_data" ? primarySheet : undefined, { limit: 10 }),
    getFileStructure(meta.file_id, primarySheet && primarySheet !== "csv_data" ? primarySheet : undefined),
  ]);

  return {
    ...meta,
    sheets,
    sheetName: primarySheet,
    columns: previewPayload.columns || [],
    preview: previewPayload.rows || [],
    totalRows: previewPayload.total_rows || 0,
    fieldCount: structurePayload.field_count || 0,
  };
}

export function NYSCSorterPage() {
  const [sourceFiles, setSourceFiles] = useState([]);
  const [specMeta, setSpecMeta] = useState(null);
  const [templateMeta, setTemplateMeta] = useState(null);
  const [templateSheetName, setTemplateSheetName] = useState("");
  const [mappings, setMappings] = useState([]);
  const [mappingTouched, setMappingTouched] = useState(false);
  const [manualFieldInput, setManualFieldInput] = useState("");
  const [uniqueKey, setUniqueKey] = useState("");
  const [outputName, setOutputName] = useState("record_sorter_output");
  const [status, setStatus] = useState({
    sourceUpload: false,
    templateUpload: false,
    running: false,
    refreshing: false,
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState(null);

  const combinedSourceColumns = useMemo(() => {
    const columns = sourceFiles.flatMap((file) => file.columns || []);
    return [...new Set(columns)];
  }, [sourceFiles]);

  const availableMappingColumns = useMemo(() => {
    const specFields = specMeta?.fields || [];
    return [...new Set([...combinedSourceColumns, ...specFields])];
  }, [combinedSourceColumns, specMeta]);

  const templateFields = useMemo(() => {
    if (templateMeta?.fields?.length) {
      return templateMeta.fields;
    }
    return mappings.map((mapping) => mapping.target).filter(Boolean);
  }, [mappings, templateMeta]);

  const mappedFieldCount = useMemo(
    () => mappings.filter((mapping) => mapping.target.trim() && mapping.source.trim()).length,
    [mappings],
  );

  const sourcePreview = sourceFiles[0]?.preview || [];

  useEffect(() => {
    if (!templateFields.length || !availableMappingColumns.length || mappingTouched) {
      return;
    }

    setMappings(buildAutoMappings(templateFields, availableMappingColumns));
  }, [availableMappingColumns, mappingTouched, templateFields]);

  useEffect(() => {
    if (!uniqueKey && combinedSourceColumns.length) {
      const suggestedUniqueKey =
        combinedSourceColumns.find((column) => ["matric_no", "matric_number", "application_number", "student_id"].includes(column)) ||
        combinedSourceColumns[0];
      setUniqueKey(suggestedUniqueKey);
    }
  }, [combinedSourceColumns, uniqueKey]);

  const handleSourceUpload = async (file) => {
    setStatus((current) => ({ ...current, sourceUpload: true }));
    setError("");
    setNotice("");

    try {
      const meta = await uploadFile(file);
      const hydrated = await hydrateSourceFile(meta);
      setSourceFiles((current) => [...current, hydrated]);
      setNotice(`${meta.filename} added to the Record Sorter source stack.`);
      setResult(null);
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, sourceUpload: false }));
    }
  };

  const handleSourceSample = async () => {
    setStatus((current) => ({ ...current, sourceUpload: true }));
    setError("");
    setNotice("");

    try {
      const meta = await uploadSampleFile();
      const hydrated = await hydrateSourceFile(meta);
      setSourceFiles((current) => [...current, hydrated]);
      setNotice("Sample dataset added to the Record Sorter source stack.");
      setResult(null);
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, sourceUpload: false }));
    }
  };

  const handleRemoveSource = (fileId) => {
    setSourceFiles((current) => current.filter((file) => file.file_id !== fileId));
    setResult(null);
  };

  const handleSourceSheetChange = async (fileId, nextSheetName) => {
    setStatus((current) => ({ ...current, refreshing: true }));
    setError("");
    try {
      const [previewPayload, structurePayload] = await Promise.all([
        getFilePreview(fileId, nextSheetName && nextSheetName !== "csv_data" ? nextSheetName : undefined, { limit: 10 }),
        getFileStructure(fileId, nextSheetName && nextSheetName !== "csv_data" ? nextSheetName : undefined),
      ]);

      setSourceFiles((current) =>
        current.map((file) =>
          file.file_id === fileId
            ? {
                ...file,
                sheetName: nextSheetName,
                columns: previewPayload.columns || [],
                preview: previewPayload.rows || [],
                totalRows: previewPayload.total_rows || 0,
                fieldCount: structurePayload.field_count || 0,
              }
            : file,
        ),
      );
      setResult(null);
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, refreshing: false }));
    }
  };

  const handleTemplateUpload = async (file) => {
    setStatus((current) => ({ ...current, templateUpload: true }));
    setError("");
    setNotice("");

    try {
      const meta = await uploadFile(file);
      const structure = await getFileStructure(meta.file_id);
      setTemplateMeta({
        ...meta,
        ...structure,
      });
      setTemplateSheetName(structure.sheet_name || "");
      setMappingTouched(false);
      setNotice(`${meta.filename} loaded as the target structure reference.`);
      setResult(null);
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, templateUpload: false }));
    }
  };

  const handleSpecUpload = async (file) => {
    setStatus((current) => ({ ...current, templateUpload: true }));
    setError("");
    setNotice("");

    try {
      const meta = await uploadFile(file);
      const structure = await getFileStructure(meta.file_id);
      setSpecMeta({
        ...meta,
        ...structure,
      });
      setMappingTouched(false);
      setNotice(`${meta.filename} loaded as the document specification source.`);
      setResult(null);
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, templateUpload: false }));
    }
  };

  const handleTemplateSheetChange = async (nextSheetName) => {
    if (!templateMeta) {
      return;
    }

    setStatus((current) => ({ ...current, refreshing: true }));
    setError("");
    try {
      const structure = await getFileStructure(
        templateMeta.file_id,
        nextSheetName && nextSheetName !== "csv_data" ? nextSheetName : undefined,
      );
      setTemplateMeta((current) => ({
        ...current,
        ...structure,
      }));
      setTemplateSheetName(nextSheetName);
      setMappingTouched(false);
      setResult(null);
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, refreshing: false }));
    }
  };

  const handleMappingChange = (target, source) => {
    setMappingTouched(true);
    setMappings((current) =>
      current.map((mapping) => (mapping.target === target ? { ...mapping, source } : mapping)),
    );
  };

  const handleAddManualField = () => {
    const value = manualFieldInput.trim();
    if (!value) {
      return;
    }

    setMappingTouched(true);
    setMappings((current) => [...current, { target: value, source: "" }]);
    setManualFieldInput("");
  };

  const handleResetSuggestions = () => {
    setMappingTouched(false);
    setMappings(buildAutoMappings(templateFields, availableMappingColumns));
    setNotice("Mapping suggestions regenerated from the current source columns and target fields.");
  };

  const handleRun = async () => {
    if (!sourceFiles.length) {
      setError("Upload at least one source workbook or CSV file.");
      return;
    }

    if (!uniqueKey) {
      setError("Choose a unique key before running the Record Sorter.");
      return;
    }

    const cleanedMappings = mappings
      .filter((mapping) => mapping.target.trim())
      .map((mapping) => ({
        target: mapping.target.trim(),
        source: mapping.source.trim(),
      }));

    if (!cleanedMappings.length && !templateFields.length) {
      setError("Upload a template/spec or add target headings before export.");
      return;
    }

    setStatus((current) => ({ ...current, running: true }));
    setError("");
    setNotice("");

    try {
      const response = await runRecordSorter({
        source_file_ids: sourceFiles.map((file) => file.file_id),
        spec_file_id: specMeta?.file_id || null,
        source_sheet_names: Object.fromEntries(
          sourceFiles.map((file) => [file.file_id, file.sheetName && file.sheetName !== "csv_data" ? file.sheetName : ""]),
        ),
        template_file_id: templateMeta?.file_id || null,
        template_sheet_name: templateMeta?.file_type === "tabular" ? templateSheetName || null : null,
        unique_key: uniqueKey,
        mappings: cleanedMappings,
        target_fields: templateFields,
        output_name: outputName.trim() || "record_sorter_output",
      });

      setResult(response);
      setNotice("Record Sorter finished. Review the output preview and download the export workbook.");
    } catch (runtimeError) {
      setError(runtimeError.message);
    } finally {
      setStatus((current) => ({ ...current, running: false }));
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Module 02"
        title="Record Sorter"
        description="Upload source records, pull the target structure from DOCX or Excel specifications, merge by a unique key like matric number, then export the finished workbook."
        actions={
          <>
            <Button variant="outline" onClick={handleResetSuggestions} disabled={!templateFields.length || !combinedSourceColumns.length}>
              <WandSparkles className="mr-2 h-4 w-4" />
              Refresh Suggestions
            </Button>
            <Button onClick={handleRun} disabled={!sourceFiles.length || status.running}>
              {status.running ? "Running..." : "Generate Output"}
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
          { label: "Source Files", value: sourceFiles.length, icon: FileStack },
          { label: "Source Fields", value: combinedSourceColumns.length, icon: Link2 },
          { label: "Target Fields", value: templateFields.length, icon: CheckCheck },
          { label: "Mapped Fields", value: mappedFieldCount, icon: WandSparkles },
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
            title="Add source workbook or CSV"
            subtitle="Upload one or more source files. The sorter will merge them by the unique key and fill the output structure."
            onFileSelect={handleSourceUpload}
            onUseSample={handleSourceSample}
            selectedFileName={sourceFiles[sourceFiles.length - 1]?.filename}
            loading={status.sourceUpload}
            selectLabel="Add Source File"
            sampleLabel="Add Sample Source"
          />

          <UploadDropzone
            title="Upload DOCX specification"
            subtitle="Use the original document to supply degree class, graduation date, programme, and other values that should come from the docx content."
            onFileSelect={handleSpecUpload}
            selectedFileName={specMeta?.filename}
            loading={status.templateUpload}
            showSampleAction={false}
            accept=".docx"
            selectLabel="Upload DOCX Spec"
            compact
          />

          <UploadDropzone
            title="Upload template or DOCX specification"
            subtitle="Use an expected output workbook or CSV to lock the final heading order and export structure."
            onFileSelect={handleTemplateUpload}
            selectedFileName={templateMeta?.filename}
            loading={status.templateUpload}
            showSampleAction={false}
            accept=".csv,.xlsx,.xls"
            selectLabel="Upload Output Template"
            compact
          />

          <Card className="border-sky-100 bg-white/90">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Merge Controls</CardTitle>
                <CardDescription className="mt-1">
                  Pick the unique key for VLOOKUP-style matching, use the docx for fixed/context fields, and use the template workbook for final output order.
                </CardDescription>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Unique Key Column</p>
                <Select value={uniqueKey} onChange={(event) => setUniqueKey(event.target.value)} disabled={!combinedSourceColumns.length}>
                  <option value="">{combinedSourceColumns.length ? "Choose unique key" : "Upload source files first"}</option>
                  {combinedSourceColumns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Output Name</p>
                <Input value={outputName} onChange={(event) => setOutputName(event.target.value)} placeholder="record_sorter_output" />
              </div>
            </div>

            {templateMeta?.file_type === "tabular" && templateMeta.sheets?.length > 1 ? (
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-slate-700">Template Sheet</p>
                <Select value={templateSheetName} onChange={(event) => handleTemplateSheetChange(event.target.value)} disabled={status.refreshing}>
                  {templateMeta.sheets.map((sheet) => (
                    <option key={sheet} value={sheet}>
                      {sheet}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            {specMeta?.defaults && Object.keys(specMeta.defaults).length ? (
              <div className="mt-4 rounded-[20px] border border-violet-100 bg-violet-50/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">DOCX Values Detected</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {Object.entries(specMeta.defaults).map(([key, value]) => (
                    <div key={key} className="rounded-2xl border border-violet-100 bg-white/85 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{key.replace(/_/g, " ")}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>

          {sourceFiles.length ? (
            <Card className="border-slate-200 bg-white/90">
              <CardTitle>Source Stack</CardTitle>
              <CardDescription className="mt-1">
                Each source file can use a different sheet. They will be merged on the unique key before mapping.
              </CardDescription>

              <div className="mt-5 space-y-3">
                {sourceFiles.map((file) => (
                  <div key={file.file_id} className="rounded-[24px] border border-slate-200 bg-slate-50/75 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-semibold text-slate-950">{file.filename}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {file.totalRows} rows · {file.fieldCount} fields
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {file.sheets?.length > 1 ? (
                          <Select value={file.sheetName} onChange={(event) => handleSourceSheetChange(file.file_id, event.target.value)} className="min-w-[180px]">
                            {file.sheets.map((sheet) => (
                              <option key={`${file.file_id}-${sheet}`} value={sheet}>
                                {sheet}
                              </option>
                            ))}
                          </Select>
                        ) : null}
                        <Button variant="outline" onClick={() => handleRemoveSource(file.file_id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="px-0 py-0">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Mapping Studio</CardTitle>
                <CardDescription className="mt-1">
                  Compare the template/spec headings with the available source columns and decide exactly what lands in the export.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={manualFieldInput}
                  onChange={(event) => setManualFieldInput(event.target.value)}
                  placeholder="Add manual target heading"
                  className="w-[220px]"
                />
                <Button variant="outline" onClick={handleAddManualField}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Heading
                </Button>
              </div>
            </div>

            {!templateFields.length ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">Upload a DOCX/Excel template or add manual target headings to start mapping.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {mappings.map((mapping) => (
                  <div key={mapping.target} className="grid gap-3 px-6 py-4 md:grid-cols-[1.1fr_1fr_auto] md:items-center">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Target Field</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{mapping.target}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Source Column</p>
                      <Select value={mapping.source} onChange={(event) => handleMappingChange(mapping.target, event.target.value)}>
                        <option value="">Leave blank</option>
                        {availableMappingColumns.map((column) => (
                          <option key={`${mapping.target}-${column}`} value={column}>
                            {column}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {mapping.source ? "Mapped" : "Blank"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {sourcePreview.length ? (
            <PreviewTable
              title="Source Preview"
              description="Quick look at the first uploaded source file so you can confirm the incoming structure before merge."
              data={sourcePreview}
            />
          ) : null}

          {result?.preview?.length ? (
            <PreviewTable
              title="Output Structure Preview"
              description="Preview how the merged records land inside the chosen template structure before download."
              data={result.preview}
            />
          ) : null}

          <Card className="border-slate-200 bg-white/90">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Audit + Export</CardTitle>
                <CardDescription className="mt-1">
                  Run the sorter to generate the completed output workbook, matched rows, unmatched rows, and source audit sheet.
                </CardDescription>
              </div>
              <Button onClick={handleRun} disabled={!sourceFiles.length || status.running}>
                {status.running ? "Running..." : "Queue Export Job"}
              </Button>
            </div>

            {status.running ? <LoadingCard title="Merging source files, applying mappings, and writing the export workbook..." /> : null}

            {result?.audit?.length ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {result.audit.map((item) => (
                  <div key={item.metric} className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{String(item.metric).replace(/_/g, " ")}</p>
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
                  Re-run Sorter
                </Button>
              </div>
            ) : null}
          </Card>
        </div>
      </section>
    </div>
  );
}

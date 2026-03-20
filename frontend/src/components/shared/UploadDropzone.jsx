import { useRef, useState } from "react";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function UploadDropzone({
  title = "Drop academic files here",
  subtitle = "CSV, XLSX, and multi-sheet Excel files are supported.",
  onFileSelect,
  onUseSample,
  selectedFileName,
  loading = false,
  compact = false,
  accept = ".csv,.xlsx,.xls",
  selectLabel = "Select File",
  showSampleAction = true,
  sampleLabel = "Use Sample Dataset",
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file) => {
    if (file && onFileSelect) {
      onFileSelect(file);
    }
  };

  return (
    <Card className="soft-grid border-dashed">
      <div
        className={`flex flex-col items-center justify-center rounded-[22px] border px-6 text-center transition ${
          isDragging
            ? "border-sky-300 bg-sky-50/90 shadow-glow"
            : "border-white/60 bg-white/70"
        } ${compact ? "py-8" : "py-12"}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFile(event.dataTransfer.files?.[0]);
        }}
      >
        <div className="rounded-full bg-sky-100 p-4 text-sky-700">
          <UploadCloud className={compact ? "h-6 w-6" : "h-8 w-8"} />
        </div>
        <h3 className={`font-display font-semibold text-slate-950 ${compact ? "mt-4 text-lg leading-8" : "mt-5 text-xl"}`}>{title}</h3>
        <p className={`max-w-lg text-slate-500 ${compact ? "mt-2 text-[13px] leading-6" : "mt-2 text-sm"}`}>{subtitle}</p>
        {selectedFileName ? (
          <div className={`flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 ${compact ? "mt-3" : "mt-4"}`}>
            <FileSpreadsheet className="h-4 w-4 text-sky-700" />
            {selectedFileName}
          </div>
        ) : null}
        <p className={`text-xs font-medium uppercase tracking-[0.24em] text-slate-400 ${compact ? "mt-3" : "mt-3"}`}>
          Drag and drop or browse
        </p>
        <div className={`flex flex-wrap justify-center gap-3 ${compact ? "mt-5" : "mt-6"}`}>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(event) => {
              handleFile(event.target.files?.[0]);
            }}
          />
          <Button disabled={loading} onClick={() => inputRef.current?.click()}>
            {loading ? "Uploading..." : selectLabel}
          </Button>
          {showSampleAction ? (
            <Button disabled={loading} variant="outline" onClick={onUseSample}>
              {sampleLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

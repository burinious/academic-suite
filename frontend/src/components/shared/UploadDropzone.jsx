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
        className={`flex flex-col items-center justify-center rounded-[22px] border px-6 py-12 text-center transition ${
          isDragging
            ? "border-sky-300 bg-sky-50/90 shadow-glow"
            : "border-white/60 bg-white/70"
        }`}
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
          <UploadCloud className="h-8 w-8" />
        </div>
        <h3 className="mt-5 font-display text-xl font-semibold text-slate-950">{title}</h3>
        <p className="mt-2 max-w-lg text-sm text-slate-500">{subtitle}</p>
        {selectedFileName ? (
          <div className="mt-4 flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700">
            <FileSpreadsheet className="h-4 w-4 text-sky-700" />
            {selectedFileName}
          </div>
        ) : null}
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
          Drag and drop or browse
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(event) => {
              handleFile(event.target.files?.[0]);
            }}
          />
          <Button disabled={loading} onClick={() => inputRef.current?.click()}>
            {loading ? "Uploading..." : "Select File"}
          </Button>
          <Button disabled={loading} variant="outline" onClick={onUseSample}>
            Use Sample Dataset
          </Button>
        </div>
      </div>
    </Card>
  );
}

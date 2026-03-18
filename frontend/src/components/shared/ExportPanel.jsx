import { Download, FileArchive, FileSpreadsheet, Files } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const actions = [
  { icon: FileSpreadsheet, label: "Export XLSX" },
  { icon: Files, label: "Export CSV" },
  { icon: FileArchive, label: "Export ZIP" },
];

export function ExportPanel({ title = "Export Center", description = "Choose a final output format and push results into the export queue." }) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <CardDescription className="mt-1">{description}</CardDescription>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {actions.map((action) => (
          <button
            key={action.label}
            className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-5 text-left transition hover:-translate-y-1 hover:border-sky-200 hover:bg-sky-50"
          >
            <action.icon className="h-5 w-5 text-sky-700" />
            <p className="mt-4 font-semibold text-slate-900">{action.label}</p>
            <p className="mt-1 text-sm text-slate-500">Prepared for template-aware export.</p>
          </button>
        ))}
      </div>
      <Button className="mt-6 w-full">
        <Download className="mr-2 h-4 w-4" />
        Queue Export Job
      </Button>
    </Card>
  );
}

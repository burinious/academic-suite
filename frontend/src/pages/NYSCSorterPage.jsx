import { CheckCheck, FileStack, Link2 } from "lucide-react";
import { ExportPanel } from "@/components/shared/ExportPanel";
import { MappingTable } from "@/components/shared/MappingTable";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { PreviewTable } from "@/components/shared/PreviewTable";
import { UploadDropzone } from "@/components/shared/UploadDropzone";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { mappingRows, tablePreview } from "@/lib/mock-data";

export function NYSCSorterPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Module 02"
        title="NYSC Sorter"
        description="Map student records into senate list and NYSC delivery templates, match entries across multiple sheets, and produce audit-ready outputs."
        actions={
          <>
            <Button>Generate Output</Button>
            <Button variant="outline">Upload Template</Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <UploadDropzone title="Upload source sheets and NYSC template" subtitle="Use multiple student source files, choose a matching key, then map into the selected target format." />
          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-100 p-3 text-cyan-700">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Template Match Controls</CardTitle>
                <CardDescription className="mt-1">
                  Define the unique key and source sheet strategy.
                </CardDescription>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Unique Key Column</p>
                <Select defaultValue="matric">
                  <option value="matric">Matric Number</option>
                  <option value="application">Application Number</option>
                  <option value="student_id">Student ID</option>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: "Mapped Fields", value: 18, icon: FileStack },
                  { label: "Match Rate", value: "92%", icon: CheckCheck },
                  { label: "Audit Sheets", value: 4, icon: Link2 },
                ].map((item) => (
                  <div key={item.label} className="rounded-[22px] border border-slate-200 bg-white/70 p-4">
                    <item.icon className="h-5 w-5 text-cyan-700" />
                    <p className="mt-4 text-sm text-slate-500">{item.label}</p>
                    <p className="mt-2 font-display text-2xl font-bold text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <MappingTable rows={mappingRows} />
          <PreviewTable
            title="Output Structure Preview"
            description="Preview how mapped fields land inside the target NYSC workbook before export."
            data={tablePreview}
          />
          <ExportPanel description="Bundle the completed output sheet, matched sheet, unmatched sheet, and audit report into a single export job." />
        </div>
      </div>
    </div>
  );
}

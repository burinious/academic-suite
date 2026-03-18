import { Layers, PieChart, SplitSquareVertical } from "lucide-react";
import { ExportPanel } from "@/components/shared/ExportPanel";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { PreviewTable } from "@/components/shared/PreviewTable";
import { UploadDropzone } from "@/components/shared/UploadDropzone";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { splitterGroups, tablePreview } from "@/lib/mock-data";

export function AdmissionSplitterPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Module 01"
        title="Admission Analysis Splitter"
        description="Slice a full admission workbook by programme, department, faculty, or level and export grouped outputs as sheets, files, or zipped bundles."
        actions={
          <>
            <Button>Run Splitter</Button>
            <Button variant="outline">Load Preset</Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-6">
          <UploadDropzone />
          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                <SplitSquareVertical className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Split Configuration</CardTitle>
                <CardDescription className="mt-1">
                  Choose the grouping field and final export behavior.
                </CardDescription>
              </div>
            </div>
            <div className="mt-6 grid gap-4">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Split Column</p>
                <Select defaultValue="faculty">
                  <option value="faculty">Faculty</option>
                  <option value="department">Department</option>
                  <option value="programme">Programme</option>
                  <option value="level">Level</option>
                </Select>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Export Mode</p>
                <Select defaultValue="zipped">
                  <option value="sheets">Separate Sheets</option>
                  <option value="files">Separate Files</option>
                  <option value="zipped">Zipped Files</option>
                </Select>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Filename Pattern</p>
                <Input defaultValue="admission_{group}_{date}" />
              </div>
              <label className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-white/70 px-4 py-4 text-sm text-slate-600">
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300" />
                Generate master summary sheet with grouped counts
              </label>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {splitterGroups.map((group, index) => {
              const icons = [Layers, PieChart, Layers, PieChart];
              const Icon = icons[index];
              return (
                <Card key={group.group}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">{group.group}</p>
                      <p className="mt-3 font-display text-3xl font-bold text-slate-950">{group.count}</p>
                      <p className="mt-2 text-sm text-sky-700">{group.percentage} of dataset</p>
                    </div>
                    <div className="rounded-2xl bg-slate-950 p-3 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <PreviewTable
            title="Split Preview"
            description="Grouped sample preview before writing workbook sheets or discrete files."
            data={tablePreview}
          />

          <ExportPanel description="Export the grouped workbook as separate sheets, files, or a zipped delivery pack." />
        </div>
      </div>
    </div>
  );
}

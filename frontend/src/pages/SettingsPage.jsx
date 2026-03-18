import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="System"
        title="Settings"
        description="Configure API targets, export behavior, and platform defaults for academic data operations."
        actions={
          <>
            <Button>Save Changes</Button>
            <Button variant="outline">Reset Defaults</Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle>Platform Configuration</CardTitle>
          <CardDescription className="mt-1">
            Adjust backend connectivity and export storage preferences.
          </CardDescription>
          <div className="mt-6 space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">API Base URL</p>
              <Input defaultValue="http://localhost:8000/api" />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Default Export Format</p>
              <Select defaultValue="xlsx">
                <option value="xlsx">XLSX</option>
                <option value="csv">CSV</option>
                <option value="zip">ZIP</option>
              </Select>
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle>Workflow Defaults</CardTitle>
          <CardDescription className="mt-1">
            Tune how the suite treats headers, validations, and reusable presets.
          </CardDescription>
          <div className="mt-6 space-y-4 text-sm text-slate-600">
            {[
              "Auto-normalize uploaded headers",
              "Create audit sheets on all template exports",
              "Keep unmatched records as blank rows",
              "Save job history locally on backend",
            ].map((item) => (
              <label key={item} className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-white/70 px-4 py-4">
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300" />
                {item}
              </label>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

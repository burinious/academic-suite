import { AlertTriangle, Filter, ShieldCheck } from "lucide-react";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { PreviewTable } from "@/components/shared/PreviewTable";
import { RuleBuilder } from "@/components/shared/RuleBuilder";
import { UploadDropzone } from "@/components/shared/UploadDropzone";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { rules, tablePreview } from "@/lib/mock-data";

export function AdmissionConfirmationPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Module 03"
        title="Admission Confirmation"
        description="Evaluate each student against configurable qualification rules and explain every decision with reasons, missing requirements, and warnings."
        actions={
          <>
            <Button>Evaluate Dataset</Button>
            <Button variant="outline">Load Rule Preset</Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <UploadDropzone title="Upload student admission records" subtitle="Bring in candidate scores, subjects, programme choices, and entry metadata for rule evaluation." />
          <RuleBuilder rules={rules} />
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Qualified", value: 812, icon: ShieldCheck, badge: "Qualified" },
              { label: "Warnings", value: 57, icon: AlertTriangle, badge: "Warning" },
              { label: "Filters", value: 6, icon: Filter, badge: "Active" },
            ].map((item) => (
              <Card key={item.label}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="mt-3 font-display text-3xl font-bold text-slate-950">{item.value}</p>
                  </div>
                  <item.icon className="h-5 w-5 text-sky-700" />
                </div>
                <div className="mt-4">
                  <StatusBadge value={item.badge} />
                </div>
              </Card>
            ))}
          </div>

          <PreviewTable
            title="Admission Results"
            description="Result grid with qualification status, ready for filters and detailed rule explanations."
            data={tablePreview}
          />

          <Card>
            <CardTitle>Decision Drawer Preview</CardTitle>
            <CardDescription className="mt-1">
              Each student can expose a full explanation panel before final export.
            </CardDescription>
            <div className="mt-6 rounded-[24px] border border-slate-200 bg-white/80 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-950">Amina Yusuf</p>
                  <p className="mt-1 text-sm text-slate-500">Economics, 100 Level, Direct Entry</p>
                </div>
                <StatusBadge value="Warning" />
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Qualified by score band, but subject evidence for Economics is incomplete. Missing requirement: Further Mathematics or approved equivalent.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

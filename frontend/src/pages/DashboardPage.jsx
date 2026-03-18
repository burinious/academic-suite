import { useEffect, useState } from "react";
import { Activity, FileSpreadsheet, Layers3, ShieldAlert } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getDashboardSummary } from "@/lib/api";

const icons = [FileSpreadsheet, Activity, Layers3, ShieldAlert];

export function DashboardPage() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    getDashboardSummary().then(setSummary);
  }, []);

  if (!summary) {
    return <div className="py-20 text-center text-slate-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Command Center"
        title="Academic data operations, in one premium workspace"
        description="Monitor processing activity, spot validation risk early, and move between cleanup, splitting, confirmation, and transformation tasks without losing data context."
        actions={
          <>
            <Button>Upload New Dataset</Button>
            <Button variant="outline">Open Export Queue</Button>
          </>
        }
      />

      <section className="grid gap-4 xl:grid-cols-4">
        {summary.totals.map((item, index) => (
          <SummaryCard key={item.label} item={item} icon={icons[index]} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Processing Pulse</CardTitle>
              <CardDescription className="mt-1">
                Weekly throughput across file ingestion and export delivery.
              </CardDescription>
            </div>
            <StatusBadge value="Active" />
          </div>
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.chart}>
                <defs>
                  <linearGradient id="processed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="processed"
                  stroke="#0284c7"
                  strokeWidth={3}
                  fill="url(#processed)"
                />
                <Area
                  type="monotone"
                  dataKey="exports"
                  stroke="#14b8a6"
                  strokeWidth={2.5}
                  fillOpacity={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle>Recent Export Runs</CardTitle>
          <CardDescription className="mt-1">
            Recent bundles across all modules and their current delivery state.
          </CardDescription>
          <div className="mt-6 space-y-4">
            {summary.exports.map((item) => (
              <div key={item.file} className="rounded-[22px] border border-slate-200 bg-white/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.file}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.module}</p>
                  </div>
                  <StatusBadge value={item.status} />
                </div>
                <p className="mt-3 text-sm text-slate-500">{item.time}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardTitle>Module Quick Actions</CardTitle>
          <CardDescription className="mt-1">
            Start common academic workflows with shared validation and export logic.
          </CardDescription>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              "Split records by faculty",
              "Map record fields for export",
              "Evaluate confirmation rules",
              "Launch sort workflow preset",
            ].map((label) => (
              <button
                key={label}
                className="rounded-[24px] border border-slate-200 bg-white/80 p-5 text-left transition hover:-translate-y-1 hover:border-sky-200 hover:bg-sky-50"
              >
                <p className="font-semibold text-slate-900">{label}</p>
                <p className="mt-2 text-sm text-slate-500">Shared upload, preview, and export services included.</p>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Validation Watchlist</CardTitle>
          <CardDescription className="mt-1">
            Issues that may block a clean export if they are not reviewed.
          </CardDescription>
          <div className="mt-6 space-y-3">
            {summary.warnings.map((warning) => (
              <div key={warning} className="rounded-[20px] border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-900">
                {warning}
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";

export function MappingTable({ rows }) {
  return (
    <Card className="px-0 py-0">
      <div className="border-b border-slate-200 px-6 py-5">
        <CardTitle>Mapping Studio</CardTitle>
        <CardDescription className="mt-1">
          Align source headings with destination template fields and review match status.
        </CardDescription>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.target} className="grid gap-3 px-6 py-4 md:grid-cols-[1.2fr_1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Target</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{row.target}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Source</p>
              <p className="mt-1 text-sm text-slate-600">{row.source}</p>
            </div>
            <StatusBadge value={row.status} />
          </div>
        ))}
      </div>
    </Card>
  );
}

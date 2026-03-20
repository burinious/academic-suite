import { Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function formatLabelFromKey(value) {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function ColumnWorkbench({
  columns,
  includeSerialNumber = false,
  onToggleSerialNumber,
  onAddHeading,
  onToggle,
  onRename,
}) {
  const selectedCount = columns.filter((column) => column.selected).length;
  const hiddenCount = columns.length - selectedCount;
  const renamedCount = columns.filter(
    (column) =>
      column.selected &&
      column.target.trim() &&
      column.kind === "source" &&
      column.target.trim() !== formatLabelFromKey(column.source),
  ).length;

  return (
    <Card className="border-slate-200 bg-[linear-gradient(140deg,rgba(255,255,255,0.97),rgba(248,250,252,0.94))]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <CardTitle>Select Columns and Rename Headers</CardTitle>
          <CardDescription className="mt-1">
            Shape the final export like the detected headings board: keep what matters, rename output labels, and hide the rest.
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {selectedCount + (includeSerialNumber ? 1 : 0)} export fields
          </div>
          <Button variant={includeSerialNumber ? "default" : "outline"} onClick={onToggleSerialNumber}>
            Add S/N
          </Button>
          <Button variant="outline" onClick={onAddHeading}>
            <Plus className="mr-2 h-4 w-4" />
            Add Heading
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-3">
        <div className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Active Fields</p>
          <p className="mt-2 font-display text-xl font-bold text-slate-950">{selectedCount}</p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Hidden Fields</p>
          <p className="mt-2 font-display text-xl font-bold text-slate-950">{hiddenCount}</p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Custom Labels</p>
          <p className="mt-2 font-display text-xl font-bold text-slate-950">{renamedCount}</p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[26px] border border-slate-200 bg-slate-50/80">
        <div className="grid grid-cols-[72px_minmax(220px,1fr)_minmax(220px,1fr)_auto] gap-3 border-b border-slate-200 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          <span>Order</span>
          <span>Source Field</span>
          <span>Export Heading</span>
          <span className="text-right">Actions</span>
        </div>

        <div className="max-h-[440px] overflow-auto">
          <div className="space-y-3 p-3">
            {columns.map((column, index) => {
              const defaultLabel = column.kind === "blank" ? "Custom Heading" : formatLabelFromKey(column.source);
              const isCustomLabel =
                column.target.trim() &&
                column.kind === "source" &&
                column.target.trim() !== defaultLabel;

              return (
                <div
                  key={column.id}
                  className={`grid gap-3 rounded-[22px] border px-4 py-4 lg:grid-cols-[72px_minmax(220px,1fr)_minmax(220px,1fr)_auto] ${
                    column.selected
                      ? "border-slate-200 bg-white/92"
                      : "border-slate-100 bg-slate-50/85 opacity-75"
                  }`}
                >
                  <div className="flex items-center justify-center rounded-[18px] bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
                    {index + 1}
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-950">{defaultLabel}</p>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {column.kind === "blank" ? "Custom" : "Source"}
                      </span>
                      {!column.selected ? (
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-700">
                          Hidden
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500">
                      {column.kind === "blank" ? "Manual heading with blank values in the export." : column.source}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Export Heading</p>
                    <Input
                      aria-label={`Export header for ${column.source || column.id}`}
                      value={column.target}
                      onChange={(event) => onRename(column.id, event.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap items-start justify-end gap-2">
                    {isCustomLabel ? (
                      <Button
                        variant="outline"
                        onClick={() => onRename(column.id, defaultLabel)}
                        className="border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset Label
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      className={
                        column.selected
                          ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
                          : "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100"
                      }
                      onClick={() => onToggle(column.id)}
                    >
                      {column.selected ? "Exclude" : "Include"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

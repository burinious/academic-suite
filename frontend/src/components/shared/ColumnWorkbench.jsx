import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ColumnWorkbench({ columns, onToggle, onRename }) {
  return (
    <Card>
      <CardTitle>Select Columns and Rename Headers</CardTitle>
      <CardDescription className="mt-1">
        Pick which fields to keep in the export and define the final output headings.
      </CardDescription>
      <div className="mt-6 space-y-3">
        {columns.map((column) => (
          <div
            key={column.source}
            className="grid gap-3 rounded-[20px] border border-slate-200 bg-white/75 p-4 md:grid-cols-[auto_1fr_1fr]"
          >
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={column.selected}
                onChange={() => onToggle(column.source)}
                aria-label={`Keep column ${column.source}`}
                className="h-4 w-4 rounded border-slate-300"
              />
              Keep
            </label>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Source</p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {column.source}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Export Header</p>
              <Input
                aria-label={`Export header for ${column.source}`}
                value={column.target}
                onChange={(event) => onRename(column.source, event.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

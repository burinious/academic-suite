import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { motion } from "framer-motion";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";

const columnHelper = createColumnHelper();

export function PreviewTable({ title, description, data = [], maxHeightClass = "max-h-[380px] xl:max-h-[44vh]" }) {
  const keys = data[0] ? Object.keys(data[0]).filter((key) => !key.startsWith("__")) : [];
  const columns = keys.map((key) =>
    columnHelper.accessor(key, {
      header: key.replace(/_/g, " "),
      cell: (info) => {
        const value = info.getValue();
        if (typeof value === "string" && ["Completed", "Warning", "Qualified", "Not Qualified", "Mapped", "Needs Review", "Queued", "Published", "Draft"].includes(value)) {
          return <StatusBadge value={value} />;
        }

        return <span className="text-sm text-slate-700">{String(value)}</span>;
      },
    }),
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className="overflow-hidden border-slate-200/90 bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(248,250,252,0.94))] px-0 py-0 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1 max-w-3xl">{description}</CardDescription>
        </div>
        <div className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {data.length} rows shown
        </div>
      </div>
      <div className={`${maxHeightClass} overflow-auto bg-white/80`}>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white/70">
            {table.getRowModel().rows.map((row) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="hover:bg-slate-50/80"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-5 py-4 align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

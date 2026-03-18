import { NavLink } from "react-router-dom";
import {
  Archive,
  ArrowRightLeft,
  BadgeCheck,
  BriefcaseBusiness,
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
  SplitSquareVertical,
  TableProperties,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const navigationItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admission-splitter", label: "Admission Analysis Splitter", icon: SplitSquareVertical },
  { to: "/nysc-sorter", label: "Record Sorter", icon: ArrowRightLeft },
  { to: "/admission-confirmation", label: "Admission Confirmation", icon: BadgeCheck },
  { to: "/sort-machine", label: "Sort Machine", icon: SlidersHorizontal },
  { to: "/templates", label: "Templates", icon: TableProperties },
  { to: "/rules", label: "Rules", icon: Upload },
  { to: "/export-history", label: "Export History", icon: Archive },
  { to: "/client-desk", label: "Client Desk", icon: BriefcaseBusiness },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="glass-panel flex h-full w-full max-w-[300px] flex-col rounded-none border-r border-white/20 bg-slate-950 px-5 py-6 text-white shadow-none lg:rounded-[0_32px_32px_0]">
      <div className="rounded-[28px] bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-400 p-[1px]">
        <div className="rounded-[27px] bg-slate-950/95 px-5 py-5">
          <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Academic Ops</p>
          <h1 className="mt-3 font-display text-2xl font-bold">Academic Data Processing Suite</h1>
          <p className="mt-3 text-sm text-slate-300">
            Premium data operations cockpit for cleanup, validation, splitting, and academic record workflows.
          </p>
        </div>
      </div>
      <nav className="mt-8 space-y-2">
        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white",
                isActive && "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
              )
            }
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto rounded-[24px] border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-sky-200">Ready for Files</p>
        <p className="mt-2 text-sm text-slate-300">
          Shared upload, preview, mapping, validation, and export services are wired for CSV and XLSX flows.
        </p>
      </div>
    </aside>
  );
}

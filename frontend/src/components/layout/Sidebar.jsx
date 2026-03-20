import { NavLink } from "react-router-dom";
import {
  Archive,
  ArrowRightLeft,
  BadgeCheck,
  BriefcaseBusiness,
  LayoutDashboard,
  Link2,
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
  { to: "/lookup-fill", label: "VLOOKUP Fill", icon: Link2 },
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
    <aside className="flex h-screen w-full max-w-[300px] flex-col overflow-hidden rounded-none border-r border-slate-900/70 bg-[linear-gradient(180deg,#020617_0%,#081426_42%,#0f172a_100%)] px-5 py-6 text-white shadow-[18px_0_48px_rgba(2,6,23,0.26)] lg:rounded-[0_32px_32px_0]">
      <div className="rounded-[28px] bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-400 p-[1px]">
        <div className="rounded-[27px] bg-slate-950/96 px-5 py-5">
          <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Academic Ops</p>
          <h1 className="mt-3 font-display text-[1.75rem] font-bold leading-tight text-white">
            <span className="block">Academic Data</span>
            <span className="block text-sky-100">Processing Suite</span>
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
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
                "flex items-start gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-white/10 hover:bg-white/8 hover:text-white",
                isActive && "border-white/12 bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
              )
            }
          >
            <item.icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 whitespace-normal leading-5">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

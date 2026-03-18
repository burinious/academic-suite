import { NavLink } from "react-router-dom";
import { navigationItems } from "./Sidebar";

export function MobileNav() {
  return (
    <div className="mb-6 overflow-x-auto lg:hidden">
      <div className="flex min-w-max gap-2 rounded-[26px] border border-white/60 bg-white/75 p-2 shadow-lg shadow-slate-200/60">
        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

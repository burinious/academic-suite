import { LogOut, Search, Sparkles, UserCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const { currentUser, logout } = useAuth();

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 items-center gap-3 rounded-[26px] border border-white/50 bg-white/75 px-4 py-3 shadow-lg shadow-slate-200/60">
        <Search className="h-4 w-4 text-slate-400" />
        <Input className="border-0 bg-transparent p-0 shadow-none focus:ring-0" placeholder="Search modules, templates, rules, or exports" />
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-3 rounded-full border border-white/60 bg-white/80 px-4 py-2.5 shadow-lg shadow-slate-200/60 md:flex">
          <div className="rounded-full bg-slate-950 p-2 text-white">
            <UserCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{currentUser?.name || "Workspace User"}</p>
            <p className="text-xs text-slate-500">{currentUser?.email || "Signed in"}</p>
          </div>
        </div>
        <Button variant="outline">
          <Sparkles className="mr-2 h-4 w-4" />
          Smart Assist
        </Button>
        <Button variant="outline" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}

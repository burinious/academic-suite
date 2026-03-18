import { Card } from "@/components/ui/card";

export function LoadingCard({ title = "Loading workspace..." }) {
  return (
    <Card>
      <div className="animate-pulse space-y-4">
        <div>
          <div className="h-4 w-28 rounded-full bg-slate-200" />
          <div className="mt-3 h-8 w-56 rounded-full bg-slate-200" />
        </div>
        <div className="grid gap-3">
          <div className="h-16 rounded-[22px] bg-slate-100" />
          <div className="h-16 rounded-[22px] bg-slate-100" />
          <div className="h-16 rounded-[22px] bg-slate-100" />
        </div>
        <p className="text-sm text-slate-500">{title}</p>
      </div>
    </Card>
  );
}

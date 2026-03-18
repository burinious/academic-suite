import { cn } from "@/lib/utils";

export function Card({ className, ...props }) {
  return <div className={cn("glass-panel rounded-[28px] p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn("font-display text-lg font-semibold text-slate-950", className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn("text-sm text-slate-500", className)} {...props} />;
}

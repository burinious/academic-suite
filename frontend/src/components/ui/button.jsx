import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-glow hover:-translate-y-0.5",
        secondary: "bg-slate-900 text-white hover:bg-slate-800",
        ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
        outline: "border border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function Button({ className, variant, ...props }) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />;
}

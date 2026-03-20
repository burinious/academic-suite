import { motion } from "framer-motion";
import { Orbit, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

export function LoadingCard({ title = "Loading workspace..." }) {
  return (
    <Card className="overflow-hidden border-sky-200 bg-[linear-gradient(140deg,rgba(255,255,255,0.97),rgba(239,246,255,0.92),rgba(236,254,255,0.88))]">
      <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/65 p-6 backdrop-blur">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.12),transparent_32%)]" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <motion.div
                className="absolute inset-0 rounded-full border border-sky-200/80 bg-sky-50/70"
                animate={{ scale: [1, 1.08, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.1, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
              />
              <motion.div
                className="absolute inset-[8px] rounded-full border border-teal-300/70 border-dashed"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
              />
              <motion.div
                className="relative flex h-10 w-10 items-center justify-center rounded-[16px] bg-gradient-to-br from-slate-950 via-sky-900 to-teal-500 text-white shadow-[0_14px_28px_rgba(14,165,233,0.2)]"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 1.8, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
              >
                <Sparkles className="h-4 w-4" />
              </motion.div>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
                <Orbit className="h-3.5 w-3.5" />
                Processing
              </div>
              <p className="mt-3 font-display text-xl font-bold text-slate-950">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Hold on while the module reads structure, prepares the preview, and updates the workspace.
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:min-w-[260px]">
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="overflow-hidden rounded-[18px] border border-white/80 bg-white/80 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                initial={{ opacity: 0.55, x: -8 }}
                animate={{ opacity: [0.55, 1, 0.55], x: [0, 6, 0] }}
                transition={{
                  duration: 1.8,
                  delay: index * 0.15,
                  ease: "easeInOut",
                  repeat: Number.POSITIVE_INFINITY,
                }}
              >
                <div className="h-2.5 w-24 rounded-full bg-slate-200" />
                <div className="mt-3 h-2.5 rounded-full bg-gradient-to-r from-slate-100 via-sky-100 to-teal-100" />
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative mt-6 overflow-hidden rounded-full bg-slate-100/90 p-1">
          <motion.div
            className="h-2 rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400"
            initial={{ x: "-52%" }}
            animate={{ x: ["-52%", "56%", "-52%"] }}
            transition={{ duration: 2.25, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
          />
        </div>
      </div>
    </Card>
  );
}

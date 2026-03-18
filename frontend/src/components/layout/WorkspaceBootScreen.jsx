import { motion } from "framer-motion";
import { Orbit, Sparkles } from "lucide-react";

const ringTransition = {
  duration: 7.5,
  ease: "linear",
  repeat: Number.POSITIVE_INFINITY,
};

export function WorkspaceBootScreen() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#f8fafc_0%,#edf5ff_42%,#eefbf7_100%)] px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.14),transparent_30%)]" />
      <div className="absolute left-12 top-16 h-40 w-40 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="absolute bottom-10 right-12 h-44 w-44 rounded-full bg-teal-200/40 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm rounded-[34px] border border-white/80 bg-white/78 p-8 text-center shadow-[0_28px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl"
      >
        <div className="mx-auto flex h-24 w-24 items-center justify-center">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <motion.div
              className="absolute inset-0 rounded-full border border-sky-200/80 bg-white/30"
              animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.95, 0.45] }}
              transition={{ duration: 2.6, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
            />
            <motion.div
              className="absolute inset-[10px] rounded-full border border-teal-300/70"
              animate={{ rotate: 360 }}
              transition={ringTransition}
            />
            <motion.div
              className="absolute inset-[18px] rounded-[24px] bg-gradient-to-br from-slate-950 via-sky-900 to-teal-500 shadow-[0_16px_36px_rgba(14,165,233,0.25)]"
              animate={{ rotate: [0, 180, 360], scale: [1, 0.94, 1] }}
              transition={{ duration: 3.4, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
            />
            <motion.div
              className="absolute flex h-10 w-10 items-center justify-center rounded-[18px] bg-white/92 text-slate-950 shadow-lg shadow-sky-100/80"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.1, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
            >
              <Sparkles className="h-4 w-4" />
            </motion.div>
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 4.8, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
            >
              <div className="absolute left-1/2 top-0 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-teal-400 shadow-[0_0_0_6px_rgba(45,212,191,0.12)]" />
            </motion.div>
          </div>
        </div>

        <div className="mt-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">
            <Orbit className="h-3.5 w-3.5" />
            Workspace Boot
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-slate-950">
            Loading workspace
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Reconnecting your suite, restoring session state, and preparing the data cockpit.
          </p>
        </div>

        <div className="mt-7 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-1.5 rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400"
            initial={{ x: "-58%" }}
            animate={{ x: ["-58%", "58%", "-58%"] }}
            transition={{ duration: 2.2, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
          />
        </div>
      </motion.div>
    </div>
  );
}

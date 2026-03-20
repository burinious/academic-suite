import { motion } from "framer-motion";

export function ModuleHeader({ eyebrow, title, description, actions }) {
  return (
    <motion.div
      className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(248,250,252,0.95),rgba(239,246,255,0.9))] px-6 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">{eyebrow}</p>
          <h1 className="mt-3 font-display text-3xl font-bold text-slate-950 lg:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-3 rounded-[24px] border border-white/80 bg-white/70 p-2 backdrop-blur-sm">
            {actions}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

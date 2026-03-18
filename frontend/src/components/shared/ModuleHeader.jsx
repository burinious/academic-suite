import { motion } from "framer-motion";

export function ModuleHeader({ eyebrow, title, description, actions }) {
  return (
    <motion.div
      className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">{eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-slate-950 lg:text-4xl">{title}</h1>
        <p className="mt-3 text-base text-slate-600">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </motion.div>
  );
}

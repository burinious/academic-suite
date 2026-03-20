import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Database, Filter, Orbit, Sparkles } from "lucide-react";

const loadingSteps = [
  {
    label: "Session restore",
    description: "Restoring your workspace state and recent context.",
    Icon: Orbit,
    accent: "from-sky-500 via-cyan-500 to-teal-400",
  },
  {
    label: "Preparing modules",
    description: "Warming up sort tools, rules, and export actions.",
    Icon: Filter,
    accent: "from-cyan-500 via-sky-500 to-blue-500",
  },
  {
    label: "Indexing data tools",
    description: "Connecting preview surfaces and processing helpers.",
    Icon: Database,
    accent: "from-teal-400 via-cyan-500 to-sky-500",
  },
];

const orbitChips = [
  { label: "Sort", x: -108, y: -26, delay: 0.1 },
  { label: "Split", x: 108, y: -12, delay: 0.28 },
  { label: "Export", x: -88, y: 84, delay: 0.44 },
  { label: "Lookup", x: 88, y: 88, delay: 0.6 },
];

export function WorkspaceBootScreen() {
  const shouldReduceMotion = useReducedMotion();
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    if (shouldReduceMotion) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveStepIndex((current) => (current + 1) % loadingSteps.length);
    }, 1800);

    return () => window.clearInterval(intervalId);
  }, [shouldReduceMotion]);

  const activeStep = loadingSteps[activeStepIndex];
  const ActiveIcon = activeStep.Icon;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#ffffff_0%,#eef7ff_34%,#edf7f3_70%,#eff6ff_100%)] px-6 py-12">
      <motion.div
        className="absolute inset-0 opacity-80"
        animate={
          shouldReduceMotion
            ? undefined
            : {
                backgroundPosition: [
                  "0% 0%, 100% 0%, 50% 100%",
                  "14% 10%, 90% 6%, 46% 90%",
                  "0% 0%, 100% 0%, 50% 100%",
                ],
              }
        }
        transition={{ duration: 10, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(14,165,233,0.18), transparent 24%), radial-gradient(circle at 84% 22%, rgba(45,212,191,0.16), transparent 26%), radial-gradient(circle at 50% 78%, rgba(59,130,246,0.12), transparent 30%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.09)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(circle_at_center,black,transparent_88%)]" />

      <motion.div
        className="absolute left-[7%] top-[14%] h-40 w-40 rounded-full bg-sky-200/40 blur-3xl"
        animate={shouldReduceMotion ? undefined : { y: [0, -18, 0], x: [0, 10, 0] }}
        transition={{ duration: 6.6, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
      />
      <motion.div
        className="absolute bottom-[10%] right-[8%] h-48 w-48 rounded-full bg-teal-200/40 blur-3xl"
        animate={shouldReduceMotion ? undefined : { y: [0, 18, 0], x: [0, -12, 0] }}
        transition={{ duration: 7.4, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
      />

      <motion.section
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-xl overflow-hidden rounded-[38px] border border-white/80 bg-white/76 px-8 py-9 shadow-[0_34px_120px_rgba(15,23,42,0.14)] backdrop-blur-2xl"
      >
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/80 to-transparent" />
        <motion.div
          className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${activeStep.accent}`}
          animate={shouldReduceMotion ? undefined : { opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
        />

        <div className="relative flex flex-col items-center text-center">
          <div className="relative flex h-44 w-44 items-center justify-center">
            <motion.div
              className="absolute inset-0 rounded-full border border-sky-100/70 bg-white/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)]"
              animate={
                shouldReduceMotion
                  ? undefined
                  : { scale: [1, 1.04, 1], opacity: [0.66, 0.96, 0.66] }
              }
              transition={{ duration: 3.1, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
            />
            <motion.div
              className="absolute inset-[14px] rounded-full border border-teal-200/80"
              animate={shouldReduceMotion ? undefined : { rotate: 360 }}
              transition={{ duration: 12, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
            />
            <motion.div
              className="absolute inset-[28px] rounded-full border border-sky-300/70 border-dashed"
              animate={shouldReduceMotion ? undefined : { rotate: -360 }}
              transition={{ duration: 14, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
            />

            {orbitChips.map((chip) => (
              <motion.div
                key={chip.label}
                className="absolute rounded-full border border-white/80 bg-white/88 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-slate-600 shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
                style={{ x: chip.x, y: chip.y }}
                animate={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: [chip.y, chip.y - 6, chip.y],
                        opacity: [0.76, 1, 0.76],
                      }
                }
                transition={{
                  duration: 2.4,
                  delay: chip.delay,
                  ease: "easeInOut",
                  repeat: Number.POSITIVE_INFINITY,
                }}
              >
                {chip.label}
              </motion.div>
            ))}

            <motion.div
              className="relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-slate-950 via-sky-900 to-teal-500 text-white shadow-[0_22px_50px_rgba(14,165,233,0.25)]"
              animate={
                shouldReduceMotion
                  ? undefined
                  : { rotate: [0, 6, -6, 0], scale: [1, 1.03, 0.99, 1] }
              }
              transition={{ duration: 4.2, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
            >
              <motion.div
                className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_34%)]"
                animate={shouldReduceMotion ? undefined : { opacity: [0.35, 0.8, 0.35] }}
                transition={{ duration: 2.2, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
              />
              <motion.div
                animate={shouldReduceMotion ? undefined : { y: [0, -3, 0] }}
                transition={{ duration: 1.9, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
              >
                <ActiveIcon className="h-8 w-8" />
              </motion.div>
            </motion.div>

            <motion.div
              className="absolute flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/94 text-slate-950 shadow-[0_18px_36px_rgba(14,165,233,0.15)]"
              style={{ x: 0, y: 74 }}
              animate={shouldReduceMotion ? undefined : { y: [74, 68, 74] }}
              transition={{ duration: 2.1, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
            >
              <Sparkles className="h-5 w-5" />
            </motion.div>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/90 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">
            <Orbit className="h-3.5 w-3.5" />
            Academic Data Suite
          </div>

          <h1 className="mt-5 font-display text-[2rem] font-bold leading-tight tracking-tight text-slate-950 sm:text-[2.2rem]">
            Loading workspace
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
            Refreshing your tools, previews, and signed-in state before the workspace opens.
          </p>

          <div className="mt-7 flex w-full max-w-md items-center gap-3 rounded-[24px] border border-slate-200/70 bg-slate-50/80 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${activeStep.accent} text-white shadow-lg`}>
              <ActiveIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <motion.p
                key={activeStep.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="text-sm font-semibold text-slate-900"
              >
                {activeStep.label}
              </motion.p>
              <motion.p
                key={activeStep.description}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
                className="mt-1 text-xs leading-5 text-slate-500"
              >
                {activeStep.description}
              </motion.p>
            </div>
          </div>

          <div className="mt-7 w-full max-w-md">
            <div className="overflow-hidden rounded-full bg-slate-100/90 p-1">
              <motion.div
                className={`h-2 rounded-full bg-gradient-to-r ${activeStep.accent}`}
                initial={{ x: "-55%" }}
                animate={shouldReduceMotion ? { x: 0 } : { x: ["-55%", "56%", "-55%"] }}
                transition={{ duration: 2.4, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
              />
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              {loadingSteps.map((step, index) => (
                <motion.div
                  key={step.label}
                  className={`h-2.5 rounded-full ${
                    index === activeStepIndex ? "w-8 bg-sky-500" : "w-2.5 bg-slate-200"
                  }`}
                  animate={
                    shouldReduceMotion || index !== activeStepIndex
                      ? undefined
                      : { opacity: [0.55, 1, 0.55] }
                  }
                  transition={{ duration: 1.4, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

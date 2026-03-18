import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

export function SummaryCard({ item, icon: Icon }) {
  return (
    <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.2 }}>
      <Card className="relative overflow-hidden">
        <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-sky-100/60 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-3 font-display text-3xl font-bold text-slate-950">
              {formatNumber(item.value)}
            </p>
            <p className="mt-2 text-sm font-medium text-sky-700">{item.change}</p>
          </div>
          <div className="rounded-2xl bg-slate-950 p-3 text-white">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

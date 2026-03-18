import { Badge } from "@/components/ui/badge";

const toneMap = {
  Completed: "success",
  Qualified: "success",
  Published: "success",
  Active: "success",
  Warning: "warning",
  Draft: "warning",
  Queued: "info",
  Mapped: "success",
  "Needs Review": "warning",
  "Not Qualified": "danger",
  Reusable: "info",
};

export function StatusBadge({ value }) {
  return <Badge tone={toneMap[value] || "neutral"}>{value}</Badge>;
}

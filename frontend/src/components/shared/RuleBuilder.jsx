import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "./StatusBadge";

export function RuleBuilder({ rules }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardTitle>Qualification Rules</CardTitle>
          <CardDescription className="mt-1">
            Mix score thresholds, subject checks, entry mode logic, and programme-specific conditions.
          </CardDescription>
        </div>
        <Button variant="outline">Add Rule</Button>
      </div>
      <div className="mt-6 space-y-4">
        {rules.map((rule) => (
          <div key={rule.title} className="rounded-[22px] border border-slate-200 bg-white/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold text-slate-900">{rule.title}</h4>
              <StatusBadge value={rule.status} />
            </div>
            <p className="mt-2 text-sm text-slate-600">{rule.detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <p className="mb-2 text-sm font-semibold text-slate-700">Rule Expression</p>
        <Textarea defaultValue="programme in ['Medicine', 'Nursing'] -> utme_score >= 220 and has_subjects(['English', 'Biology', 'Chemistry'])" />
      </div>
    </Card>
  );
}

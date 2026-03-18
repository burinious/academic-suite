import { useEffect, useState } from "react";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { RuleBuilder } from "@/components/shared/RuleBuilder";
import { Button } from "@/components/ui/button";
import { getRules } from "@/lib/api";

export function RulesPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    getRules().then(setItems);
  }, []);

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Resources"
        title="Rules"
        description="Create, revise, and publish qualification logic for admission confirmation and downstream validation checks."
        actions={
          <>
            <Button>Save Preset</Button>
            <Button variant="outline">Publish Rules</Button>
          </>
        }
      />
      <RuleBuilder rules={items} />
    </div>
  );
}

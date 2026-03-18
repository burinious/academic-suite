import { useEffect, useState } from "react";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { PreviewTable } from "@/components/shared/PreviewTable";
import { Button } from "@/components/ui/button";
import { getExportHistory } from "@/lib/api";

export function ExportHistoryPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    getExportHistory().then(setItems);
  }, []);

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Operations"
        title="Export History"
        description="Review previous processing runs, audit export status, and revisit generated academic deliverables."
        actions={
          <>
            <Button>Refresh History</Button>
            <Button variant="outline">Download Latest</Button>
          </>
        }
      />
      <PreviewTable
        title="Export Log"
        description="Historical exports from all modules, including current queue state."
        data={items}
      />
    </div>
  );
}

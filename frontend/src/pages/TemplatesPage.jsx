import { useEffect, useState } from "react";
import { FileSpreadsheet, Layers2 } from "lucide-react";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getTemplates } from "@/lib/api";

export function TemplatesPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    getTemplates().then(setItems);
  }, []);

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Resources"
        title="Templates"
        description="Maintain reusable output structures for NYSC sheets, admission summaries, and transformation exports."
        actions={
          <>
            <Button>Upload Template</Button>
            <Button variant="outline">Create Mapping</Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        {items.map((template, index) => {
          const Icon = index % 2 === 0 ? FileSpreadsheet : Layers2;
          return (
            <Card key={template.name}>
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                  <Icon className="h-5 w-5" />
                </div>
                <StatusBadge value="Published" />
              </div>
              <CardTitle className="mt-5">{template.name}</CardTitle>
              <CardDescription className="mt-2">
                {template.fields} mapped fields • {template.type} template • updated {template.updatedAt}
              </CardDescription>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

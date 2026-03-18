import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function EmptyState({ title, description }) {
  return (
    <Card className="border-dashed text-center">
      <CardTitle>{title}</CardTitle>
      <CardDescription className="mt-2">{description}</CardDescription>
    </Card>
  );
}

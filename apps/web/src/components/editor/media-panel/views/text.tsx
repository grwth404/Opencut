import { Card } from "@/components/ui/card";

export function TextView() {
  return (
    <div className="p-4">
      <Card className="flex items-center justify-center size-24">
        <span className="text-xs select-none">Default text</span>
      </Card>
    </div>
  );
}

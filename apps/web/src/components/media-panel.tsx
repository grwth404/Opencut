"use client";

import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { AspectRatio } from "./ui/aspect-ratio";

const mediaItems = [
  { name: "Sample 1", type: "image" },
  { name: "Sample 2", type: "image" },
  { name: "Sample 3", type: "image" },
  { name: "Sample 4", type: "image" },
  { name: "Sample 5", type: "image" },
  { name: "Sample 6", type: "image" },
] as const;

export function MediaPanel() {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-2">
        {/* Media Grid */}
        <div className="grid grid-cols-2 gap-2">
          {mediaItems.map((item) => (
            <Button
              key={item.name}
              variant="outline"
              className="flex flex-col gap-2 p-0 h-auto overflow-hidden"
            >
              <AspectRatio ratio={16 / 9} className="w-full">
                <div className="w-full h-full bg-muted/30 flex items-center justify-center text-muted-foreground text-xs">
                  {item.name}
                </div>
              </AspectRatio>
            </Button>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

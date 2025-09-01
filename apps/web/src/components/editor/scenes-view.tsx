"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useSceneStore } from "@/stores/scene-store";
import { Check } from "lucide-react";

export function ScenesView({ children }: { children: React.ReactNode }) {
  const { scenes, currentScene, switchToScene } = useSceneStore();

  const handleSceneSwitch = async (sceneId: string) => {
    try {
      await switchToScene({ sceneId });
    } catch (error) {
      console.error("Failed to switch scene:", error);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Scenes</SheetTitle>
          <SheetDescription>
            Switch between scenes in your project
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
          {scenes.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No scenes available
            </div>
          ) : (
            <div className="space-y-2">
              {scenes.map((scene) => (
                <Button
                  key={scene.id}
                  variant={
                    currentScene?.id === scene.id ? "default" : "outline"
                  }
                  className="w-full justify-between"
                  onClick={() => handleSceneSwitch(scene.id)}
                >
                  <span>{scene.name}</span>
                  {currentScene?.id === scene.id && (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

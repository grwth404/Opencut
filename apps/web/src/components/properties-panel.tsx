"use client";

import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

export function PropertiesPanel() {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-5">
        {/* Transform */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Transform</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="x">X Position</Label>
                <Input id="x" type="number" defaultValue="0" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="y">Y Position</Label>
                <Input id="y" type="number" defaultValue="0" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="rotation">Rotation</Label>
              <Slider
                id="rotation"
                max={360}
                step={1}
                defaultValue={[0]}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Effects */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Effects</h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="opacity">Opacity</Label>
              <Slider
                id="opacity"
                max={100}
                step={1}
                defaultValue={[100]}
                className="mt-2"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="blur">Blur</Label>
              <Slider
                id="blur"
                max={20}
                step={0.5}
                defaultValue={[0]}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Timing */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Timing</h3>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                min="0"
                step="0.1"
                defaultValue="5"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="delay">Delay (seconds)</Label>
              <Input
                id="delay"
                type="number"
                min="0"
                step="0.1"
                defaultValue="0"
              />
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

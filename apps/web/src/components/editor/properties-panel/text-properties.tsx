import { Textarea } from "@/components/ui/textarea";
import { FontPicker } from "@/components/ui/font-picker";
import { FontFamily } from "@/constants/font-constants";
import { TextElement } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  PropertyItem,
  PropertyItemLabel,
  PropertyItemValue,
} from "./property-item";

export function TextProperties({
  element,
  trackId,
}: {
  element: TextElement;
  trackId: string;
}) {
  const { updateTextElement } = useTimelineStore();

  return (
    <div className="space-y-6 p-5">
      <Textarea
        placeholder="Name"
        defaultValue={element.content}
        className="min-h-[4.5rem] resize-none bg-background/50"
        onChange={(e) =>
          updateTextElement(trackId, element.id, { content: e.target.value })
        }
      />
      <PropertyItem direction="row">
        <PropertyItemLabel>Font</PropertyItemLabel>
        <PropertyItemValue>
          <FontPicker
            defaultValue={element.fontFamily}
            onValueChange={(value: FontFamily) =>
              updateTextElement(trackId, element.id, { fontFamily: value })
            }
          />
        </PropertyItemValue>
      </PropertyItem>
      <PropertyItem direction="column">
      <PropertyItem direction="row">
        <PropertyItemLabel>Style</PropertyItemLabel>
        <PropertyItemValue>
          <div className="flex items-center gap-2">
            <Button
              variant={element.fontWeight === "bold" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                updateTextElement(trackId, element.id, {
                  fontWeight: element.fontWeight === "bold" ? "normal" : "bold",
                })
              }
              className="h-8 px-3 font-bold"
            >
              B
            </Button>
            <Button
              variant={element.fontStyle === "italic" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                updateTextElement(trackId, element.id, {
                  fontStyle: element.fontStyle === "italic" ? "normal" : "italic",
                })
              }
              className="h-8 px-3 italic"
            >
              I
            </Button>
            <Button
              variant={element.textDecoration === "underline" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                updateTextElement(trackId, element.id, {
                  textDecoration: element.textDecoration === "underline" ? "none" : "underline",
                })
              }
              className="h-8 px-3 underline"
            >
              U
            </Button>
            <Button
              variant={element.textDecoration === "line-through" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                updateTextElement(trackId, element.id, {
                  textDecoration: element.textDecoration === "line-through" ? "none" : "line-through",
                })
              }
              className="h-8 px-3 line-through"
            >
              <span className="line-through">S</span>
            </Button>
          </div>
        </PropertyItemValue>
      </PropertyItem>
        <PropertyItemLabel>Font size</PropertyItemLabel>
        <PropertyItemValue>
          <div className="flex items-center gap-2">
            <Slider
              defaultValue={[element.fontSize]}
              min={8}
              max={300}
              step={1}
              onValueChange={([value]) =>
                updateTextElement(trackId, element.id, { fontSize: value })
              }
              className="w-full"
            />
            <Input
              type="number"
              value={element.fontSize}
              onChange={(e) =>
                updateTextElement(trackId, element.id, {
                  fontSize: parseInt(e.target.value),
                })
              }
              className="w-12 !text-xs h-7 rounded-sm text-center
               [appearance:textfield]
               [&::-webkit-outer-spin-button]:appearance-none
               [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </PropertyItemValue>
      </PropertyItem>
      <PropertyItem direction="row">
        <PropertyItemLabel>Color</PropertyItemLabel>
        <PropertyItemValue>
          <Input
            type="color"
            value={element.color || "#ffffff"}
            onChange={(e) => {
              const color = e.target.value;
              updateTextElement(trackId, element.id, { color });
            }}
            className="w-full cursor-pointer rounded-full"
          />
        </PropertyItemValue>
      </PropertyItem>
      <PropertyItem direction="row">
        <PropertyItemLabel>Background</PropertyItemLabel>
        <PropertyItemValue>
          <Input
            type="color"
            value={element.backgroundColor === "transparent" ? "#000000" : element.backgroundColor || "#000000"}
            onChange={(e) => {
              const backgroundColor = e.target.value;
              updateTextElement(trackId, element.id, { backgroundColor });
            }}
            className="w-full cursor-pointer rounded-full"
          />
        </PropertyItemValue>
      </PropertyItem>
      <PropertyItem direction="column">
        <PropertyItemLabel>Opacity</PropertyItemLabel>
        <PropertyItemValue>
          <div className="flex items-center gap-2">
            <Slider
              defaultValue={[element.opacity * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={([value]) =>
                updateTextElement(trackId, element.id, { opacity: value / 100 })
              }
              className="w-full"
            />
            <Input
              type="number"
              value={Math.round(element.opacity * 100)}
              onChange={(e) =>
                updateTextElement(trackId, element.id, {
                  opacity: parseInt(e.target.value) / 100,
                })
              }
              className="w-12 !text-xs h-7 rounded-sm text-center
               [appearance:textfield]
               [&::-webkit-outer-spin-button]:appearance-none
               [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </PropertyItemValue>
      </PropertyItem>
    </div>
  );
}
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FONT_OPTIONS, FontFamily } from "@/constants/font-constants";
import { TextElement } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

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
        className="min-h-[4.5rem] resize-none"
        onChange={(e) =>
          updateTextElement(trackId, element.id, { content: e.target.value })
        }
      />
      <div className="flex items-center justify-between gap-6">
        <Label className="text-xs">Font</Label>
        <Select
          defaultValue={element.fontFamily}
          onValueChange={(value: FontFamily) =>
            updateTextElement(trackId, element.id, { fontFamily: value })
          }
        >
          <SelectTrigger className="w-full text-xs">
            <SelectValue placeholder="Select a font" />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs">Font size</Label>
        <div className="flex items-center  gap-2">
          <Slider
            defaultValue={[element.fontSize]}
            min={8}
            max={200}
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
      </div>
    </div>
  );
}

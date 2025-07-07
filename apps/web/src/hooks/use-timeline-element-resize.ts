import { useState } from "react";
import { ResizeState, TimelineElement, TimelineTrack } from "@/types/timeline";

interface UseTimelineElementResizeProps {
  element: TimelineElement;
  track: TimelineTrack;
  zoomLevel: number;
  onUpdateTrim: (
    trackId: string,
    elementId: string,
    trimStart: number,
    trimEnd: number
  ) => void;
}

export function useTimelineElementResize({
  element,
  track,
  zoomLevel,
  onUpdateTrim,
}: UseTimelineElementResizeProps) {
  const [resizing, setResizing] = useState<ResizeState | null>(null);

  const handleResizeStart = (
    e: React.MouseEvent,
    elementId: string,
    side: "left" | "right"
  ) => {
    e.stopPropagation();
    e.preventDefault();

    setResizing({
      elementId,
      side,
      startX: e.clientX,
      initialTrimStart: element.trimStart,
      initialTrimEnd: element.trimEnd,
    });
  };

  const updateTrimFromMouseMove = (e: { clientX: number }) => {
    if (!resizing) return;

    const deltaX = e.clientX - resizing.startX;
    const deltaTime = deltaX / (50 * zoomLevel);

    if (resizing.side === "left") {
      const newTrimStart = Math.max(
        0,
        Math.min(
          element.duration - element.trimEnd - 0.1,
          resizing.initialTrimStart + deltaTime
        )
      );
      onUpdateTrim(track.id, element.id, newTrimStart, element.trimEnd);
    } else {
      const newTrimEnd = Math.max(
        0,
        Math.min(
          element.duration - element.trimStart - 0.1,
          resizing.initialTrimEnd - deltaTime
        )
      );
      onUpdateTrim(track.id, element.id, element.trimStart, newTrimEnd);
    }
  };

  const handleResizeMove = (e: React.MouseEvent) => {
    updateTrimFromMouseMove(e);
  };

  const handleResizeEnd = () => {
    setResizing(null);
  };

  return {
    resizing,
    isResizing: resizing !== null,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
  };
}

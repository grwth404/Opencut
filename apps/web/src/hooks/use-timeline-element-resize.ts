import { useState, useEffect } from "react";
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

  // Set up document-level mouse listeners during resize (like proper drag behavior)
  useEffect(() => {
    if (!resizing) return;

    const handleDocumentMouseMove = (e: MouseEvent) => {
      updateTrimFromMouseMove({ clientX: e.clientX });
    };

    const handleDocumentMouseUp = () => {
      handleResizeEnd();
    };

    // Add document-level listeners for proper drag behavior
    document.addEventListener("mousemove", handleDocumentMouseMove);
    document.addEventListener("mouseup", handleDocumentMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleDocumentMouseMove);
      document.removeEventListener("mouseup", handleDocumentMouseUp);
    };
  }, [resizing]); // Re-run when resizing state changes

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
    // Reasonable sensitivity for resize operations - similar to timeline scale
    const deltaTime = deltaX / (50 * zoomLevel);

    if (resizing.side === "left") {
      const maxAllowed = element.duration - resizing.initialTrimEnd - 0.1;
      const calculated = resizing.initialTrimStart + deltaTime;
      const newTrimStart = Math.max(0, Math.min(maxAllowed, calculated));

      onUpdateTrim(track.id, element.id, newTrimStart, resizing.initialTrimEnd);
    } else {
      // For right resize (expanding element), allow trimEnd to go to 0 but cap at element duration
      const calculated = resizing.initialTrimEnd - deltaTime;
      // Prevent negative trim AND prevent trimEnd from exceeding element duration
      const maxTrimEnd = element.duration - resizing.initialTrimStart - 0.1; // Leave at least 0.1s visible
      const newTrimEnd = Math.max(0, Math.min(maxTrimEnd, calculated));

      onUpdateTrim(track.id, element.id, resizing.initialTrimStart, newTrimEnd);
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
    // Return empty handlers since we use document listeners now
    handleResizeMove: () => {}, // Not used anymore
    handleResizeEnd: () => {}, // Not used anymore
  };
}

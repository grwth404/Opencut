"use client";

import { useActionHandler } from "@/constants/actions";

interface UseTimelineZoomActionsProps {
  zoomLevel: number;
  setZoomLevel: (zoomLevel: number | ((prev: number) => number)) => void;
  onFitToWindow?: () => void;
}

export function useTimelineZoomActions({
  zoomLevel,
  setZoomLevel,
  onFitToWindow,
}: UseTimelineZoomActionsProps) {
  // Zoom in action
  useActionHandler("zoom-in", () => {
    setZoomLevel((prev) => Math.min(5, prev + 0.2));
  });

  // Zoom out action
  useActionHandler("zoom-out", () => {
    setZoomLevel((prev) => Math.max(0.1, prev - 0.2));
  });

  // Reset zoom action
  useActionHandler("zoom-reset", () => {
    setZoomLevel(1);
  });

  // Fit to window action
  useActionHandler("zoom-fit", () => {
    if (onFitToWindow) {
      onFitToWindow();
    }
  });
}

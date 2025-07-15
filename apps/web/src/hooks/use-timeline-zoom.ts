import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { useState, useCallback, RefObject, useMemo } from "react";

interface UseTimelineZoomProps {
  containerRef: RefObject<HTMLDivElement>;
  isInTimeline?: boolean;
}

interface UseTimelineZoomReturn {
  zoomLevel: number;
  zoomStep: number;
  setZoomLevel: (zoomLevel: number | ((prev: number) => number)) => void;
  handleChangeZoomStep: (zoomStep: number) => void;
  handleChangeZoomLevel: (zoomStep: number) => void;
  handleWheel: (e: React.WheelEvent) => void;
}

export function useTimelineZoom(): UseTimelineZoomReturn {
  const [zoomLevel, setZoomLevel] = useState(1);

  const zoomStep = useMemo(
    () =>
      Math.max(1, Math.round(zoomLevel / TIMELINE_CONSTANTS.ZOOM_STEP_BASE)),
    [zoomLevel]
  );

  const handleChangeZoomStep = useCallback((newStep: number) => {
    setZoomLevel(
      Math.max(
        TIMELINE_CONSTANTS.ZOOM_LEVEL_MIN,
        newStep * TIMELINE_CONSTANTS.ZOOM_STEP_BASE
      )
    );
  }, []);

  const handleChangeZoomLevel = useCallback((newLevel: number) => {
    setZoomLevel(
      Math.max(
        TIMELINE_CONSTANTS.ZOOM_LEVEL_MIN,
        Math.min(TIMELINE_CONSTANTS.ZOOM_LEVEL_MAX, newLevel)
      )
    );
  }, []);

  // Mouse wheel zoom, ctrl/meta gesture
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault?.();
      const delta =
        e.deltaY > 0
          ? -TIMELINE_CONSTANTS.ZOOM_STEP_BASE
          : TIMELINE_CONSTANTS.ZOOM_STEP_BASE;
      setZoomLevel((prev) =>
        Math.max(
          TIMELINE_CONSTANTS.ZOOM_LEVEL_MIN,
          Math.min(TIMELINE_CONSTANTS.ZOOM_LEVEL_MAX, prev + delta)
        )
      );
    }
  }, []);

  return {
    zoomLevel,
    zoomStep,
    setZoomLevel,
    handleChangeZoomStep,
    handleChangeZoomLevel,
    handleWheel,
  };
}

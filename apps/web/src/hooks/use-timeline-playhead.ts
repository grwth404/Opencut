import { snapTimeToFrame } from "@/constants/timeline-constants";
import { useProjectStore } from "@/stores/project-store";
import { useRef, useState, useCallback } from "react";

interface UseTimelinePlayheadProps {
  currentTime: number;
  duration: number;
  zoomLevel: number;
  seek: (time: number) => void;
  rulerRef: React.RefObject<HTMLDivElement>;
  rulerScrollRef: React.RefObject<HTMLDivElement>;
}

export function useTimelinePlayhead({
  currentTime,
  duration,
  zoomLevel,
  seek,
  rulerRef,
  rulerScrollRef,
}: UseTimelinePlayheadProps) {
  const { activeProject } = useProjectStore();

  const isScrubbingRef = useRef(false);
  const scrubTimeRef = useRef<number | null>(null);
  const [_, forceRerender] = useState(0);

  const playheadPosition =
    isScrubbingRef.current && scrubTimeRef.current !== null
      ? scrubTimeRef.current
      : currentTime;

  const getTimeFromMouse = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      const ruler = rulerRef.current;
      const scrollArea = rulerScrollRef.current?.querySelector(
        "[data-radix-scroll-area-viewport]"
      ) as HTMLElement;

      if (!ruler || !scrollArea) return 0;

      const rect = ruler.getBoundingClientRect();
      const scrollLeft = scrollArea.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;

      const pixelsPerSecond = 50 * zoomLevel;
      const rawTime = Math.max(0, Math.min(duration, x / pixelsPerSecond));
      const time = snapTimeToFrame(rawTime, activeProject?.fps || 30);
      return time;
    },
    [rulerRef, rulerScrollRef, duration, zoomLevel, activeProject?.fps]
  );

  const handleRulerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const time = getTimeFromMouse(e);
      if (time === undefined) return;

      isScrubbingRef.current = true;
      scrubTimeRef.current = time;
      seek(time);

      const onMouseMove = (e: MouseEvent) => {
        const t = getTimeFromMouse(e);
        if (t !== scrubTimeRef.current) {
          scrubTimeRef.current = t;
          seek(t);
        }
      };

      const onMouseUp = () => {
        isScrubbingRef.current = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        forceRerender((v) => v + 1);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [getTimeFromMouse, seek]
  );

  return {
    playheadPosition,
    handleRulerMouseDown,
  };
}

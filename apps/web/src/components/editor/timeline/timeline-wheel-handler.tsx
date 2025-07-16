import { useEffect } from "react";

export interface TimelineWheelHandlerProps {
  timelineRef: React.RefObject<HTMLDivElement>;
  isInTimeline: boolean;
  handleWheel: (e: React.WheelEvent) => void;
}

export function useTimelineWheelHandler({
  timelineRef,
  isInTimeline,
  handleWheel,
}: TimelineWheelHandlerProps) {
  // Add wheel event listeners with passive: false to allow preventDefault
  useEffect(() => {
    const timelineContainer = timelineRef.current;
    if (!timelineContainer || !isInTimeline) return;

    const handleWheelCapture = (e: WheelEvent) => {
      // Call the existing handleWheel function
      handleWheel(e as any);
    };

    // Add wheel event listener with passive: false to allow preventDefault
    timelineContainer.addEventListener("wheel", handleWheelCapture, { passive: false });

    return () => {
      timelineContainer.removeEventListener("wheel", handleWheelCapture);
    };
  }, [handleWheel, isInTimeline, timelineRef]);

  return null;
}

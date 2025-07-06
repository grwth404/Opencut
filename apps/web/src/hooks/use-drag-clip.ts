import { useState, useEffect, useCallback, useRef } from "react";
import { useTimelineStore } from "@/stores/timeline-store";

interface DragState {
  isDragging: boolean;
  elementId: string | null;
  trackId: string | null;
  startMouseX: number;
  startElementTime: number;
  clickOffsetTime: number;
  currentTime: number;
}

export function useDragClip(zoomLevel: number) {
  const { tracks, updateElementStartTime, moveElementToTrack } =
    useTimelineStore();

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    elementId: null,
    trackId: null,
    startMouseX: 0,
    startElementTime: 0,
    clickOffsetTime: 0,
    currentTime: 0,
  });

  const timelineRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef(dragState);

  // Keep ref in sync with state
  dragStateRef.current = dragState;

  const startDrag = useCallback(
    (
      e: React.MouseEvent,
      elementId: string,
      trackId: string,
      elementStartTime: number,
      clickOffsetTime: number
    ) => {
      e.preventDefault();
      e.stopPropagation();

      setDragState({
        isDragging: true,
        elementId,
        trackId,
        startMouseX: e.clientX,
        startElementTime: elementStartTime,
        clickOffsetTime,
        currentTime: elementStartTime,
      });
    },
    []
  );

  const updateDrag = useCallback(
    (e: MouseEvent) => {
      if (!dragState.isDragging || !timelineRef.current) {
        return;
      }

      const timelineRect = timelineRef.current.getBoundingClientRect();
      const mouseX = e.clientX - timelineRect.left;
      const mouseTime = Math.max(0, mouseX / (50 * zoomLevel));
      const adjustedTime = Math.max(0, mouseTime - dragState.clickOffsetTime);
      const snappedTime = Math.round(adjustedTime * 10) / 10;

      setDragState((prev) => ({
        ...prev,
        currentTime: snappedTime,
      }));
    },
    [dragState.isDragging, dragState.clickOffsetTime, zoomLevel]
  );

  const endDrag = useCallback(
    (targetTrackId?: string) => {
      if (!dragState.isDragging || !dragState.elementId || !dragState.trackId)
        return;

      const finalTrackId = targetTrackId || dragState.trackId;
      const finalTime = dragState.currentTime;

      // Check for overlaps
      const sourceTrack = tracks.find((t) => t.id === dragState.trackId);
      const targetTrack = tracks.find((t) => t.id === finalTrackId);
      const movingElement = sourceTrack?.elements.find(
        (e) => e.id === dragState.elementId
      );

      if (!movingElement || !targetTrack) {
        setDragState((prev) => ({ ...prev, isDragging: false }));
        return;
      }

      const movingElementDuration =
        movingElement.duration -
        movingElement.trimStart -
        movingElement.trimEnd;
      const movingElementEnd = finalTime + movingElementDuration;

      const hasOverlap = targetTrack.elements.some((existingElement) => {
        // Skip the element being moved if it's on the same track
        if (
          dragState.trackId === finalTrackId &&
          existingElement.id === dragState.elementId
        ) {
          return false;
        }

        const existingStart = existingElement.startTime;
        const existingEnd =
          existingElement.startTime +
          (existingElement.duration -
            existingElement.trimStart -
            existingElement.trimEnd);

        return finalTime < existingEnd && movingElementEnd > existingStart;
      });

      if (!hasOverlap) {
        if (dragState.trackId === finalTrackId) {
          // Moving within same track
          updateElementStartTime(finalTrackId, dragState.elementId!, finalTime);
        } else {
          // Moving to different track
          moveElementToTrack(
            dragState.trackId!,
            finalTrackId,
            dragState.elementId!
          );
          requestAnimationFrame(() => {
            updateElementStartTime(
              finalTrackId,
              dragState.elementId!,
              finalTime
            );
          });
        }
      }

      setDragState({
        isDragging: false,
        elementId: null,
        trackId: null,
        startMouseX: 0,
        startElementTime: 0,
        clickOffsetTime: 0,
        currentTime: 0,
      });
    },
    [dragState, tracks, updateElementStartTime, moveElementToTrack]
  );

  const cancelDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      elementId: null,
      trackId: null,
      startMouseX: 0,
      startElementTime: 0,
      clickOffsetTime: 0,
      currentTime: 0,
    });
  }, []);

  // Global mouse events
  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => updateDrag(e);
    const handleMouseUp = () => endDrag();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelDrag();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [dragState.isDragging, updateDrag, endDrag, cancelDrag]);

  const getDraggedElementPosition = useCallback(
    (elementId: string) => {
      // Use ref to get current state, not stale closure
      const currentDragState = dragStateRef.current;
      const isMatch =
        currentDragState.isDragging && currentDragState.elementId === elementId;

      if (isMatch) {
        return currentDragState.currentTime;
      }
      return null;
    },
    [] // No dependencies needed since we use ref
  );

  const isValidDropTarget = useCallback(
    (trackId: string) => {
      if (!dragState.isDragging) return false;

      const sourceTrack = tracks.find((t) => t.id === dragState.trackId);
      const targetTrack = tracks.find((t) => t.id === trackId);

      if (!sourceTrack || !targetTrack) return false;

      // For now, allow drops on same track type
      return sourceTrack.type === targetTrack.type;
    },
    [dragState.isDragging, dragState.trackId, tracks]
  );

  return {
    // State
    isDragging: dragState.isDragging,
    draggedElementId: dragState.elementId,
    currentDragTime: dragState.currentTime,
    clickOffsetTime: dragState.clickOffsetTime,

    // Methods
    startDrag,
    endDrag,
    cancelDrag,
    getDraggedElementPosition,
    isValidDropTarget,

    // Refs
    timelineRef,
  };
}

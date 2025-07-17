"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useTimelineZoom } from "@/hooks/use-timeline-zoom";
import { useSelectionBox } from "@/hooks/use-selection-box";
import { SnapPoint } from "@/hooks/use-timeline-snapping";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { TimelineToolbar } from "./timeline/timeline-toolbar";
import { TimelineContent } from "./timeline/timeline-content";
import { useTimelineDragHandlers } from "./timeline/timeline-drag-handlers";
import { useTimelineActionHandlers } from "./timeline/timeline-action-handlers";
import { useTimelineScrollSync } from "./timeline/timeline-scroll-sync";
import { useTimelineContentClick } from "./timeline/timeline-content-click";
import { useTimelineWheelHandler } from "./timeline/timeline-wheel-handler";

export function Timeline() {
  // Timeline shows all tracks (video, audio, effects) and their elements.
  // You can drag media here to add it to your project.
  // elements can be trimmed, deleted, and moved.

  const {
    tracks,
    getTotalDuration,
    selectedElements,
    clearSelectedElements,
    setSelectedElements,
    dragState,
    snappingEnabled,
  } = useTimelineStore();
  const { currentTime, duration, seek, setDuration } = usePlaybackStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [isInTimeline, setIsInTimeline] = useState(false);

  // Timeline zoom functionality
  const { zoomLevel, setZoomLevel, handleWheel } = useTimelineZoom({
    containerRef: timelineRef,
    isInTimeline,
  });

  // Dynamic timeline width calculation based on playhead position and duration
  const dynamicTimelineWidth = Math.max(
    (duration || 0) * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel, // Base width from duration
    (currentTime + 30) * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel, // Width to show current time + 30 seconds buffer
    timelineRef.current?.clientWidth || 1000 // Minimum width
  );

  // Scroll synchronization and auto-scroll to playhead
  const rulerScrollRef = useRef<HTMLDivElement>(null);
  const tracksScrollRef = useRef<HTMLDivElement>(null);
  const trackLabelsRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const trackLabelsScrollRef = useRef<HTMLDivElement>(null);

  // Selection box functionality
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const {
    selectionBox,
    handleMouseDown: handleSelectionMouseDown,
    isSelecting,
    justFinishedSelecting,
  } = useSelectionBox({
    containerRef: tracksContainerRef,
    playheadRef,
    onSelectionComplete: (elements) => {
      console.log(JSON.stringify({ onSelectionComplete: elements.length }));
      setSelectedElements(elements);
    },
  });

  // Calculate snap indicator state
  const [currentSnapPoint, setCurrentSnapPoint] = useState<SnapPoint | null>(
    null
  );
  const showSnapIndicator =
    dragState.isDragging && snappingEnabled && currentSnapPoint !== null;

  // Callback to handle snap point changes from TimelineTrackContent
  const handleSnapPointChange = useCallback((snapPoint: SnapPoint | null) => {
    setCurrentSnapPoint(snapPoint);
  }, []);

  // Timeline content click handler
  const { handleTimelineContentClick } = useTimelineContentClick({
    duration,
    zoomLevel,
    seek,
    rulerScrollRef,
    tracksScrollRef,
    clearSelectedElements,
    isSelecting,
    justFinishedSelecting,
    playheadRef,
  });

  // Update timeline duration when tracks change
  useEffect(() => {
    const totalDuration = getTotalDuration();
    setDuration(Math.max(totalDuration, 10)); // Minimum 10 seconds for empty timeline
  }, [tracks, setDuration, getTotalDuration]);

  // Drag handlers
  const { dragProps } = useTimelineDragHandlers({
    isDragOver,
    setIsDragOver,
    isProcessing,
    setIsProcessing,
    progress,
    setProgress,
  });

  // Action handlers
  const {
    handleSplitSelected,
    handleDuplicateSelected,
    handleFreezeSelected,
    handleSplitAndKeepLeft,
    handleSplitAndKeepRight,
    handleSeparateAudio,
    handleDeleteSelected,
  } = useTimelineActionHandlers();

  // Scroll synchronization
  useTimelineScrollSync({
    rulerScrollRef,
    tracksScrollRef,
  });

  // Wheel event handling
  useTimelineWheelHandler({
    timelineRef,
    isInTimeline,
    handleWheel,
  });

  return (
    <div
      className={`h-full flex flex-col transition-colors duration-200 relative bg-panel rounded-sm overflow-hidden`}
      {...dragProps}
      onMouseEnter={() => setIsInTimeline(true)}
      onMouseLeave={() => setIsInTimeline(false)}
    >
      {/* Toolbar */}
      <TimelineToolbar
        handleSplitSelected={handleSplitSelected}
        handleSplitAndKeepLeft={handleSplitAndKeepLeft}
        handleSplitAndKeepRight={handleSplitAndKeepRight}
        handleSeparateAudio={handleSeparateAudio}
        handleDuplicateSelected={handleDuplicateSelected}
        handleFreezeSelected={handleFreezeSelected}
        handleDeleteSelected={handleDeleteSelected}
      />

      {/* Timeline Container */}
      <div
        ref={timelineRef}
        className="relative h-full w-full overflow-auto border"
        onMouseEnter={() => setIsInTimeline(true)}
        onMouseLeave={() => setIsInTimeline(false)}
        onMouseDown={handleSelectionMouseDown}
        onClick={handleTimelineContentClick}
      >
        <TimelineContent
          dynamicTimelineWidth={dynamicTimelineWidth}
          tracks={tracks}
          duration={duration}
          zoomLevel={zoomLevel}
          currentTime={currentTime}
          seek={seek}
          rulerRef={rulerRef}
          rulerScrollRef={rulerScrollRef}
          tracksScrollRef={tracksScrollRef}
          playheadRef={playheadRef}
          trackLabelsRef={trackLabelsRef}
          timelineRef={timelineRef}
          handleSelectionMouseDown={handleSelectionMouseDown}
          handleTimelineContentClick={handleTimelineContentClick}
          handleSnapPointChange={handleSnapPointChange}
          clearSelectedElements={clearSelectedElements}
          selectionBox={selectionBox}
          tracksContainerRef={tracksContainerRef}
          currentSnapPoint={currentSnapPoint}
          showSnapIndicator={showSnapIndicator}
        />
      </div>
    </div>
  );
}

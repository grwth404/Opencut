"use client";

import { TimelineTrack } from "@/types/timeline";
import {
  TIMELINE_CONSTANTS,
  getTotalTracksHeight,
} from "@/constants/timeline-constants";
import { useTimelinePlayhead } from "@/hooks/use-timeline-playhead";

interface TimelinePlayheadProps {
  currentTime: number;
  duration: number;
  zoomLevel: number;
  tracks: TimelineTrack[];
  seek: (time: number) => void;
  rulerRef: React.RefObject<HTMLDivElement>;
  rulerScrollRef: React.RefObject<HTMLDivElement>;
  tracksScrollRef: React.RefObject<HTMLDivElement>;
}

export function TimelinePlayhead({
  currentTime,
  duration,
  zoomLevel,
  tracks,
  seek,
  rulerRef,
  rulerScrollRef,
  tracksScrollRef,
}: TimelinePlayheadProps) {
  const { playheadPosition, handlePlayheadMouseDown } = useTimelinePlayhead({
    currentTime,
    duration,
    zoomLevel,
    seek,
    rulerRef,
    rulerScrollRef,
    tracksScrollRef,
  });

  return (
    <>
      {/* Playhead in ruler (scrubbable) */}
      <div
        className="playhead absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-auto z-50 cursor-col-resize"
        style={{
          left: `${playheadPosition * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel}px`,
        }}
        onMouseDown={handlePlayheadMouseDown}
      >
        <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm" />
      </div>
    </>
  );
}

interface TimelinePlayheadTracksProps {
  currentTime: number;
  duration: number;
  zoomLevel: number;
  tracks: TimelineTrack[];
  seek: (time: number) => void;
  rulerRef: React.RefObject<HTMLDivElement>;
  rulerScrollRef: React.RefObject<HTMLDivElement>;
  tracksScrollRef: React.RefObject<HTMLDivElement>;
}

export function TimelinePlayheadTracks({
  currentTime,
  duration,
  zoomLevel,
  tracks,
  seek,
  rulerRef,
  rulerScrollRef,
  tracksScrollRef,
}: TimelinePlayheadTracksProps) {
  const { playheadPosition, handlePlayheadMouseDown } = useTimelinePlayhead({
    currentTime,
    duration,
    zoomLevel,
    seek,
    rulerRef,
    rulerScrollRef,
    tracksScrollRef,
  });

  if (tracks.length === 0) return null;

  return (
    <div
      className="absolute top-0 w-0.5 bg-red-500 pointer-events-auto z-50 cursor-col-resize"
      style={{
        left: `${playheadPosition * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel}px`,
        height: `${getTotalTracksHeight(tracks)}px`,
      }}
      onMouseDown={handlePlayheadMouseDown}
    />
  );
}

// Also export a hook for getting ruler handlers
export function useTimelinePlayheadRuler({
  currentTime,
  duration,
  zoomLevel,
  seek,
  rulerRef,
  rulerScrollRef,
  tracksScrollRef,
}: Omit<TimelinePlayheadProps, "tracks" | "dynamicTimelineWidth">) {
  const { handleRulerMouseDown, isDraggingRuler } = useTimelinePlayhead({
    currentTime,
    duration,
    zoomLevel,
    seek,
    rulerRef,
    rulerScrollRef,
    tracksScrollRef,
  });

  return { handleRulerMouseDown, isDraggingRuler };
}

export { TimelinePlayhead as default };

"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { TimelineClip } from "./timeline-clip";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore, type TimelineTrack } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";

interface TimelineTrackContentProps {
  track: TimelineTrack;
  zoomLevel: number;
  setContextMenu: (
    menu: {
      type: "track" | "clip";
      trackId: string;
      clipId?: string;
      x: number;
      y: number;
    } | null
  ) => void;
}

export function TimelineTrackContent({
  track,
  zoomLevel,
  setContextMenu,
}: TimelineTrackContentProps) {
  const { mediaItems } = useMediaStore();
  const {
    tracks,
    moveClipToTrack,
    updateClipTrim,
    updateClipStartTime,
    addClipToTrack,
    removeClipFromTrack,
    toggleTrackMute,
    selectedClips,
    selectClip,
    deselectClip,
  } = useTimelineStore();
  const { currentTime } = usePlaybackStore();
  const [isDropping, setIsDropping] = useState(false);
  const [dropPosition, setDropPosition] = useState<number | null>(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [wouldOverlap, setWouldOverlap] = useState(false);
  const [resizing, setResizing] = useState<{
    clipId: string;
    side: "left" | "right";
    startX: number;
    initialTrimStart: number;
    initialTrimEnd: number;
  } | null>(null);
  const dragCounterRef = useRef(0);

  const handleResizeStart = (
    e: React.MouseEvent,
    clipId: string,
    side: "left" | "right"
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const clip = track.clips.find((c) => c.id === clipId);
    if (!clip) return;

    setResizing({
      clipId,
      side,
      startX: e.clientX,
      initialTrimStart: clip.trimStart,
      initialTrimEnd: clip.trimEnd,
    });
  };

  const updateTrimFromMouseMove = (e: { clientX: number }) => {
    if (!resizing) return;

    const clip = track.clips.find((c) => c.id === resizing.clipId);
    if (!clip) return;

    const deltaX = e.clientX - resizing.startX;
    const deltaTime = deltaX / (50 * zoomLevel);

    if (resizing.side === "left") {
      const newTrimStart = Math.max(
        0,
        Math.min(
          clip.duration - clip.trimEnd - 0.1,
          resizing.initialTrimStart + deltaTime
        )
      );
      updateClipTrim(track.id, clip.id, newTrimStart, clip.trimEnd);
    } else {
      const newTrimEnd = Math.max(
        0,
        Math.min(
          clip.duration - clip.trimStart - 0.1,
          resizing.initialTrimEnd - deltaTime
        )
      );
      updateClipTrim(track.id, clip.id, clip.trimStart, newTrimEnd);
    }
  };

  const handleResizeMove = (e: React.MouseEvent) => {
    updateTrimFromMouseMove(e);
  };

  const handleResizeEnd = () => {
    setResizing(null);
  };

  const handleClipDragStart = (e: React.DragEvent, clip: any) => {
    const dragData = { clipId: clip.id, trackId: track.id, name: clip.name };

    e.dataTransfer.setData(
      "application/x-timeline-clip",
      JSON.stringify(dragData)
    );
    e.dataTransfer.effectAllowed = "move";

    // Add visual feedback to the dragged element
    const target = e.currentTarget.parentElement as HTMLElement;
    target.style.opacity = "0.5";
    target.style.transform = "scale(0.95)";
  };

  const handleClipDragEnd = (e: React.DragEvent) => {
    // Reset visual feedback
    const target = e.currentTarget.parentElement as HTMLElement;
    target.style.opacity = "";
    target.style.transform = "";
  };

  const handleTrackDragOver = (e: React.DragEvent) => {
    e.preventDefault();

    // Handle both timeline clips and media items
    const hasTimelineClip = e.dataTransfer.types.includes(
      "application/x-timeline-clip"
    );
    const hasMediaItem = e.dataTransfer.types.includes(
      "application/x-media-item"
    );

    if (!hasTimelineClip && !hasMediaItem) return;

    if (hasMediaItem) {
      try {
        const mediaItemData = e.dataTransfer.getData(
          "application/x-media-item"
        );
        if (mediaItemData) {
          const { type } = JSON.parse(mediaItemData);
          const isCompatible =
            (track.type === "video" &&
              (type === "video" || type === "image")) ||
            (track.type === "audio" && type === "audio");

          if (!isCompatible) {
            e.dataTransfer.dropEffect = "none";
            return;
          }
        }
      } catch (error) {}
    }

    // Calculate drop position for overlap checking
    const trackContainer = e.currentTarget.querySelector(
      ".track-clips-container"
    ) as HTMLElement;
    let dropTime = 0;
    if (trackContainer) {
      const rect = trackContainer.getBoundingClientRect();
      const mouseX = Math.max(0, e.clientX - rect.left);
      dropTime = mouseX / (50 * zoomLevel);
    }

    // Check for potential overlaps and show appropriate feedback
    let wouldOverlap = false;

    if (hasMediaItem) {
      try {
        const mediaItemData = e.dataTransfer.getData(
          "application/x-media-item"
        );
        if (mediaItemData) {
          const { id } = JSON.parse(mediaItemData);
          const mediaItem = mediaItems.find((item) => item.id === id);
          if (mediaItem) {
            const newClipDuration = mediaItem.duration || 5;
            const snappedTime = Math.round(dropTime * 10) / 10;
            const newClipEnd = snappedTime + newClipDuration;

            wouldOverlap = track.clips.some((existingClip) => {
              const existingStart = existingClip.startTime;
              const existingEnd =
                existingClip.startTime +
                (existingClip.duration -
                  existingClip.trimStart -
                  existingClip.trimEnd);
              return snappedTime < existingEnd && newClipEnd > existingStart;
            });
          }
        }
      } catch (error) {
        // Continue with default behavior
      }
    } else if (hasTimelineClip) {
      try {
        const timelineClipData = e.dataTransfer.getData(
          "application/x-timeline-clip"
        );
        if (timelineClipData) {
          const { clipId, trackId: fromTrackId } = JSON.parse(timelineClipData);
          const sourceTrack = tracks.find(
            (t: TimelineTrack) => t.id === fromTrackId
          );
          const movingClip = sourceTrack?.clips.find(
            (c: any) => c.id === clipId
          );

          if (movingClip) {
            const movingClipDuration =
              movingClip.duration - movingClip.trimStart - movingClip.trimEnd;
            const snappedTime = Math.round(dropTime * 10) / 10;
            const movingClipEnd = snappedTime + movingClipDuration;

            wouldOverlap = track.clips.some((existingClip) => {
              if (fromTrackId === track.id && existingClip.id === clipId)
                return false;

              const existingStart = existingClip.startTime;
              const existingEnd =
                existingClip.startTime +
                (existingClip.duration -
                  existingClip.trimStart -
                  existingClip.trimEnd);
              return snappedTime < existingEnd && movingClipEnd > existingStart;
            });
          }
        }
      } catch (error) {
        // Continue with default behavior
      }
    }

    if (wouldOverlap) {
      e.dataTransfer.dropEffect = "none";
      setIsDraggedOver(true);
      setWouldOverlap(true);
      setDropPosition(Math.round(dropTime * 10) / 10);
      return;
    }

    e.dataTransfer.dropEffect = hasTimelineClip ? "move" : "copy";
    setIsDraggedOver(true);
    setWouldOverlap(false);
    setDropPosition(Math.round(dropTime * 10) / 10);
  };

  const handleTrackDragEnter = (e: React.DragEvent) => {
    e.preventDefault();

    const hasTimelineClip = e.dataTransfer.types.includes(
      "application/x-timeline-clip"
    );
    const hasMediaItem = e.dataTransfer.types.includes(
      "application/x-media-item"
    );

    if (!hasTimelineClip && !hasMediaItem) return;

    dragCounterRef.current++;
    setIsDropping(true);
    setIsDraggedOver(true);
  };

  const handleTrackDragLeave = (e: React.DragEvent) => {
    e.preventDefault();

    const hasTimelineClip = e.dataTransfer.types.includes(
      "application/x-timeline-clip"
    );
    const hasMediaItem = e.dataTransfer.types.includes(
      "application/x-media-item"
    );

    if (!hasTimelineClip && !hasMediaItem) return;

    dragCounterRef.current--;

    if (dragCounterRef.current === 0) {
      setIsDropping(false);
      setIsDraggedOver(false);
      setWouldOverlap(false);
      setDropPosition(null);
    }
  };

  const handleTrackDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Reset all drag states
    dragCounterRef.current = 0;
    setIsDropping(false);
    setIsDraggedOver(false);
    setWouldOverlap(false);
    const currentDropPosition = dropPosition;
    setDropPosition(null);

    const hasTimelineClip = e.dataTransfer.types.includes(
      "application/x-timeline-clip"
    );
    const hasMediaItem = e.dataTransfer.types.includes(
      "application/x-media-item"
    );

    if (!hasTimelineClip && !hasMediaItem) return;

    const trackContainer = e.currentTarget.querySelector(
      ".track-clips-container"
    ) as HTMLElement;
    if (!trackContainer) return;

    const rect = trackContainer.getBoundingClientRect();
    const mouseX = Math.max(0, e.clientX - rect.left);
    const newStartTime = mouseX / (50 * zoomLevel);
    const snappedTime = Math.round(newStartTime * 10) / 10;

    try {
      if (hasTimelineClip) {
        // Handle timeline clip movement
        const timelineClipData = e.dataTransfer.getData(
          "application/x-timeline-clip"
        );
        if (!timelineClipData) return;

        const { clipId, trackId: fromTrackId } = JSON.parse(timelineClipData);

        // Find the clip being moved
        const sourceTrack = tracks.find(
          (t: TimelineTrack) => t.id === fromTrackId
        );
        const movingClip = sourceTrack?.clips.find((c: any) => c.id === clipId);

        if (!movingClip) {
          toast.error("Clip not found");
          return;
        }

        // Check for overlaps with existing clips (excluding the moving clip itself)
        const movingClipDuration =
          movingClip.duration - movingClip.trimStart - movingClip.trimEnd;
        const movingClipEnd = snappedTime + movingClipDuration;

        const hasOverlap = track.clips.some((existingClip) => {
          // Skip the clip being moved if it's on the same track
          if (fromTrackId === track.id && existingClip.id === clipId)
            return false;

          const existingStart = existingClip.startTime;
          const existingEnd =
            existingClip.startTime +
            (existingClip.duration -
              existingClip.trimStart -
              existingClip.trimEnd);

          // Check if clips overlap
          return snappedTime < existingEnd && movingClipEnd > existingStart;
        });

        if (hasOverlap) {
          toast.error(
            "Cannot move clip here - it would overlap with existing clips"
          );
          return;
        }

        if (fromTrackId === track.id) {
          // Moving within same track
          updateClipStartTime(track.id, clipId, snappedTime);
        } else {
          // Moving to different track
          moveClipToTrack(fromTrackId, track.id, clipId);
          requestAnimationFrame(() => {
            updateClipStartTime(track.id, clipId, snappedTime);
          });
        }
      } else if (hasMediaItem) {
        // Handle media item drop
        const mediaItemData = e.dataTransfer.getData(
          "application/x-media-item"
        );
        if (!mediaItemData) return;

        const { id, type } = JSON.parse(mediaItemData);
        const mediaItem = mediaItems.find((item) => item.id === id);

        if (!mediaItem) {
          toast.error("Media item not found");
          return;
        }

        // Check if track type is compatible
        const isCompatible =
          (track.type === "video" && (type === "video" || type === "image")) ||
          (track.type === "audio" && type === "audio");

        if (!isCompatible) {
          toast.error(`Cannot add ${type} to ${track.type} track`);
          return;
        }

        // Check for overlaps with existing clips
        const newClipDuration = mediaItem.duration || 5;
        const newClipEnd = snappedTime + newClipDuration;

        const hasOverlap = track.clips.some((existingClip) => {
          const existingStart = existingClip.startTime;
          const existingEnd =
            existingClip.startTime +
            (existingClip.duration -
              existingClip.trimStart -
              existingClip.trimEnd);

          // Check if clips overlap
          return snappedTime < existingEnd && newClipEnd > existingStart;
        });

        if (hasOverlap) {
          toast.error(
            "Cannot place clip here - it would overlap with existing clips"
          );
          return;
        }

        addClipToTrack(track.id, {
          mediaId: mediaItem.id,
          name: mediaItem.name,
          duration: mediaItem.duration || 5,
          startTime: snappedTime,
          trimStart: 0,
          trimEnd: 0,
        });

        toast.success(`Added ${mediaItem.name} to ${track.name}`);
      }
    } catch (error) {
      console.error("Error handling drop:", error);
      toast.error("Failed to add media to track");
    }
  };

  const getTrackColor = (type: string) => {
    switch (type) {
      case "video":
        return "bg-blue-500/20 border-blue-500/30";
      case "audio":
        return "bg-green-500/20 border-green-500/30";
      case "effects":
        return "bg-purple-500/20 border-purple-500/30";
      default:
        return "bg-gray-500/20 border-gray-500/30";
    }
  };

  return (
    <div
      className={`w-full h-full transition-all duration-150 ease-out ${
        isDraggedOver
          ? wouldOverlap
            ? "bg-red-500/15 border-2 border-dashed border-red-400 shadow-lg"
            : "bg-blue-500/15 border-2 border-dashed border-blue-400 shadow-lg"
          : "hover:bg-muted/20"
      }`}
      onContextMenu={(e) => {
        e.preventDefault();
        // Only show track menu if we didn't click on a clip
        if (!(e.target as HTMLElement).closest(".timeline-clip")) {
          setContextMenu({
            type: "track",
            trackId: track.id,
            x: e.clientX,
            y: e.clientY,
          });
        }
      }}
      onDragOver={handleTrackDragOver}
      onDragEnter={handleTrackDragEnter}
      onDragLeave={handleTrackDragLeave}
      onDrop={handleTrackDrop}
      onMouseMove={handleResizeMove}
      onMouseUp={handleResizeEnd}
      onMouseLeave={handleResizeEnd}
    >
      <div className="h-full relative track-clips-container min-w-full">
        {track.clips.length === 0 ? (
          <div
            className={`h-full w-full rounded-sm border-2 border-dashed flex items-center justify-center text-xs text-muted-foreground transition-colors ${
              isDropping
                ? wouldOverlap
                  ? "border-red-500 bg-red-500/10 text-red-600"
                  : "border-blue-500 bg-blue-500/10 text-blue-600"
                : "border-muted/30"
            }`}
          >
            {isDropping
              ? wouldOverlap
                ? "Cannot drop - would overlap"
                : "Drop clip here"
              : "Drop media here"}
          </div>
        ) : (
          <>
            {track.clips.map((clip) => {
              const isSelected = selectedClips.some(
                (c) => c.trackId === track.id && c.clipId === clip.id
              );
              return (
                <TimelineClip
                  key={clip.id}
                  clip={clip}
                  track={track}
                  zoomLevel={zoomLevel}
                  isSelected={isSelected}
                  onResizeStart={handleResizeStart}
                  onClipDragStart={handleClipDragStart}
                  onClipDragEnd={handleClipDragEnd}
                  onSelect={(e) => {
                    e.stopPropagation();
                    const isSelected = selectedClips.some(
                      (c) => c.trackId === track.id && c.clipId === clip.id
                    );

                    if (e.metaKey || e.ctrlKey || e.shiftKey) {
                      // Multi-selection mode: toggle the clip
                      selectClip(track.id, clip.id, true);
                    } else if (isSelected) {
                      // If clip is already selected, deselect it
                      deselectClip(track.id, clip.id);
                    } else {
                      // If clip is not selected, select it (replacing other selections)
                      selectClip(track.id, clip.id, false);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({
                      type: "clip",
                      trackId: track.id,
                      clipId: clip.id,
                      x: e.clientX,
                      y: e.clientY,
                    });
                  }}
                  getTrackColor={getTrackColor}
                />
              );
            })}

            {/* Drop position indicator */}
            {isDraggedOver && dropPosition !== null && (
              <div
                className={`absolute top-0 bottom-0 w-1 pointer-events-none z-30 transition-all duration-75 ease-out ${wouldOverlap ? "bg-red-500" : "bg-blue-500"}`}
                style={{
                  left: `${dropPosition * 50 * zoomLevel}px`,
                  transform: "translateX(-50%)",
                }}
              >
                <div
                  className={`absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md ${wouldOverlap ? "bg-red-500" : "bg-blue-500"}`}
                />
                <div
                  className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md ${wouldOverlap ? "bg-red-500" : "bg-blue-500"}`}
                />
                <div
                  className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs text-white px-1 py-0.5 rounded whitespace-nowrap ${wouldOverlap ? "bg-red-500" : "bg-blue-500"}`}
                >
                  {wouldOverlap ? "⚠️" : ""}
                  {dropPosition.toFixed(1)}s
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { Button } from "../../ui/button";
import { MoreVertical, Scissors, Trash2 } from "lucide-react";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore, type TimelineTrack } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { type TimelineClip } from "@/types/timeline";
import { useState } from "react";

interface TimelineClipProps {
  clip: TimelineClip;
  track: TimelineTrack;
  zoomLevel: number;
  isSelected: boolean;
  onResizeStart: (
    e: React.MouseEvent,
    clipId: string,
    side: "left" | "right"
  ) => void;
  onClipDragStart: (e: React.DragEvent, clip: any) => void;
  onClipDragEnd: (e: React.DragEvent) => void;
  onSelect: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  getTrackColor: (type: string) => string;
}

export function TimelineClip({
  clip,
  track,
  zoomLevel,
  isSelected,
  onResizeStart,
  onClipDragStart,
  onClipDragEnd,
  onSelect,
  onContextMenu,
  getTrackColor,
}: TimelineClipProps) {
  const { mediaItems } = useMediaStore();
  const { addClipToTrack, updateClipTrim, removeClipFromTrack } =
    useTimelineStore();
  const { currentTime } = usePlaybackStore();
  const [clipMenuOpen, setClipMenuOpen] = useState<string | null>(null);

  const effectiveDuration = clip.duration - clip.trimStart - clip.trimEnd;
  const clipWidth = Math.max(80, effectiveDuration * 50 * zoomLevel);
  const clipLeft = clip.startTime * 50 * zoomLevel;

  const renderClipContent = (clip: TimelineClip) => {
    const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);

    if (!mediaItem) {
      return (
        <span className="text-xs text-foreground/80 truncate">{clip.name}</span>
      );
    }

    if (mediaItem.type === "image") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={mediaItem.url}
            alt={mediaItem.name}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    if (mediaItem.type === "video" && mediaItem.thumbnailUrl) {
      return (
        <div className="w-full h-full flex items-center gap-2">
          <div className="w-8 h-8 flex-shrink-0">
            <img
              src={mediaItem.thumbnailUrl}
              alt={mediaItem.name}
              className="w-full h-full object-cover rounded-sm"
            />
          </div>
          <span className="text-xs text-foreground/80 truncate flex-1">
            {clip.name}
          </span>
        </div>
      );
    }

    // Fallback for audio or videos without thumbnails
    return (
      <span className="text-xs text-foreground/80 truncate">{clip.name}</span>
    );
  };

  const handleSplitClip = (clip: TimelineClip) => {
    // Use current playback time as split point
    const splitTime = currentTime;

    // Only split if splitTime is within the clip's effective range
    const effectiveStart = clip.startTime;
    const effectiveEnd =
      clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);
    if (splitTime <= effectiveStart || splitTime >= effectiveEnd) return;

    const firstDuration = splitTime - effectiveStart;
    const secondDuration = effectiveEnd - splitTime;

    // First part: adjust original clip
    updateClipTrim(
      track.id,
      clip.id,
      clip.trimStart,
      clip.trimEnd + secondDuration
    );

    // Second part: add new clip after split
    addClipToTrack(track.id, {
      mediaId: clip.mediaId,
      name: clip.name + " (cut)",
      duration: clip.duration,
      startTime: splitTime,
      trimStart: clip.trimStart + firstDuration,
      trimEnd: clip.trimEnd,
    });
  };

  const handleDeleteClip = (clipId: string) => {
    removeClipFromTrack(track.id, clipId);
  };

  return (
    <div
      className={`timeline-clip absolute h-full border transition-all duration-200 ${getTrackColor(track.type)} flex items-center py-3 min-w-[80px] overflow-hidden group hover:shadow-lg ${isSelected ? "ring-2 ring-blue-500 z-10" : ""}`}
      style={{ width: `${clipWidth}px`, left: `${clipLeft}px` }}
      onClick={onSelect}
      tabIndex={0}
      onContextMenu={onContextMenu}
    >
      {/* Left trim handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500/50 hover:bg-blue-500"
        onMouseDown={(e) => onResizeStart(e, clip.id, "left")}
      />

      {/* Clip content */}
      <div
        className="flex-1 cursor-grab active:cursor-grabbing relative"
        draggable={true}
        onDragStart={(e) => onClipDragStart(e, clip)}
        onDragEnd={onClipDragEnd}
      >
        {renderClipContent(clip)}

        {/* Clip options menu */}
        <div className="absolute top-1 right-1 z-10">
          <Button
            variant="text"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setClipMenuOpen(clip.id)}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
          {clipMenuOpen === clip.id && (
            <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-50">
              <button
                className="flex items-center w-full px-3 py-2 text-sm hover:bg-muted/30"
                onClick={() => {
                  handleSplitClip(clip);
                  setClipMenuOpen(null);
                }}
              >
                <Scissors className="h-4 w-4 mr-2" /> Split
              </button>
              <button
                className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                onClick={() => handleDeleteClip(clip.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right trim handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500/50 hover:bg-blue-500"
        onMouseDown={(e) => onResizeStart(e, clip.id, "right")}
      />
    </div>
  );
}

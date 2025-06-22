"use client";

import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import {
  Scissors,
  ArrowLeftToLine,
  ArrowRightToLine,
  Trash2,
  Snowflake,
  Copy,
  SplitSquareHorizontal,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "../ui/tooltip";
import { DragOverlay } from "../ui/drag-overlay";
import { useTimelineStore, type TimelineTrack } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { processMediaFiles } from "@/lib/media-processing";
import { ImageTimelineTreatment } from "@/components/ui/image-timeline-treatment";
import { toast } from "sonner";
import { useState, useRef } from "react";

export function Timeline() {
  const { tracks, addTrack, addClipToTrack } = useTimelineStore();
  const { mediaItems, addMediaItem } = useMediaStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();

    // Don't show overlay for timeline clips or other internal drags
    if (e.dataTransfer.types.includes("application/x-timeline-clip")) {
      return;
    }

    dragCounterRef.current += 1;
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();

    // Don't update state for timeline clips
    if (e.dataTransfer.types.includes("application/x-timeline-clip")) {
      return;
    }

    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    dragCounterRef.current = 0;

    // Check if this is a timeline clip drop - now we'll handle it!
    const timelineClipData = e.dataTransfer.getData(
      "application/x-timeline-clip"
    );
    if (timelineClipData) {
      // Timeline clips dropped on the main timeline area (not on a specific track)
      // For now, we'll just ignore these - clips should be dropped on specific tracks
      return;
    }

    // Check if this is an internal media item drop
    const mediaItemData = e.dataTransfer.getData("application/x-media-item");
    if (mediaItemData) {
      try {
        const { id, type, name } = JSON.parse(mediaItemData);

        // Find the full media item from the store
        const mediaItem = mediaItems.find((item) => item.id === id);
        if (!mediaItem) {
          toast.error("Media item not found");
          return;
        }

        // Determine track type based on media type
        let trackType: "video" | "audio" | "effects";
        if (type === "video") {
          trackType = "video";
        } else if (type === "audio") {
          trackType = "audio";
        } else {
          // For images, we'll put them on video tracks
          trackType = "video";
        }

        // Create a new track and get its ID
        const newTrackId = addTrack(trackType);

        // Add the clip to the new track
        addClipToTrack(newTrackId, {
          mediaId: mediaItem.id,
          name: mediaItem.name,
          duration: mediaItem.duration || 5, // Default 5 seconds for images
        });

        toast.success(`Added ${name} to ${trackType} track`);
      } catch (error) {
        console.error("Error parsing media item data:", error);
        toast.error("Failed to add media to timeline");
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Handle external file drops
      setIsProcessing(true);

      try {
        const processedItems = await processMediaFiles(e.dataTransfer.files);

        for (const processedItem of processedItems) {
          // Add to media store first
          addMediaItem(processedItem);

          // The media item now has an ID, let's get it from the latest state
          // Since addMediaItem is synchronous, we can get the latest item
          const currentMediaItems = useMediaStore.getState().mediaItems;
          const addedItem = currentMediaItems.find(
            (item) =>
              item.name === processedItem.name && item.url === processedItem.url
          );

          if (addedItem) {
            // Determine track type based on media type
            let trackType: "video" | "audio" | "effects";
            if (processedItem.type === "video") {
              trackType = "video";
            } else if (processedItem.type === "audio") {
              trackType = "audio";
            } else {
              // For images, we'll put them on video tracks
              trackType = "video";
            }

            // Create a new track and get its ID
            const newTrackId = addTrack(trackType);

            // Add the clip to the new track
            addClipToTrack(newTrackId, {
              mediaId: addedItem.id,
              name: addedItem.name,
              duration: addedItem.duration || 5, // Default 5 seconds for images
            });

            toast.success(`Added ${processedItem.name} to timeline`);
          }
        }
      } catch (error) {
        console.error("Error processing external files:", error);
        toast.error("Failed to process dropped files");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const dragProps = {
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  return (
    <div
      className={`h-full flex flex-col transition-colors duration-200 relative ${
        isDragOver ? "bg-accent/30 border-accent" : ""
      }`}
      {...dragProps}
    >
      <DragOverlay
        isVisible={isDragOver}
        title={isProcessing ? "Processing files..." : "Drop media here"}
        description={
          isProcessing
            ? "Please wait while files are being processed"
            : "Add media to timeline tracks"
        }
      />

      {/* Toolbar */}
      <div className="border-b flex items-center px-2 py-1 gap-1">
        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Scissors className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split clip (S)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <ArrowLeftToLine className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split and keep left (A)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <ArrowRightToLine className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split and keep right (D)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <SplitSquareHorizontal className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Separate audio (E)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate clip (Ctrl+D)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Snowflake className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Freeze frame (F)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete clip (Delete)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Tracks Area */}
      <ScrollArea className="flex-1">
        <div className="min-w-[800px]">
          {/* Time Markers */}
          <div className="py-2 pt-1 flex items-center">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="w-[50px] flex items-end justify-center text-xs text-muted-foreground"
              >
                {i}s
              </div>
            ))}
          </div>

          {/* Timeline Tracks */}
          {tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <SplitSquareHorizontal className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No tracks in timeline
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Add a video or audio track to get started
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {tracks.map((track) => (
                <TimelineTrackComponent key={track.id} track={track} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function TimelineTrackComponent({ track }: { track: TimelineTrack }) {
  const { mediaItems } = useMediaStore();
  const { moveClipToTrack, reorderClipInTrack } = useTimelineStore();
  const [isDropping, setIsDropping] = useState(false);

  const handleClipDragStart = (e: React.DragEvent, clip: any) => {
    // Mark this as an timeline clip drag to differentiate from media items
    const dragData = {
      clipId: clip.id,
      trackId: track.id,
      name: clip.name,
    };

    e.dataTransfer.setData(
      "application/x-timeline-clip",
      JSON.stringify(dragData)
    );
    e.dataTransfer.effectAllowed = "move";

    // Use the entire clip container as the drag image instead of just the content
    const target = e.currentTarget as HTMLElement;
    e.dataTransfer.setDragImage(
      target,
      target.offsetWidth / 2,
      target.offsetHeight / 2
    );
  };

  const handleTrackDragOver = (e: React.DragEvent) => {
    e.preventDefault();

    // Only handle timeline clip drags
    if (!e.dataTransfer.types.includes("application/x-timeline-clip")) {
      return;
    }

    e.dataTransfer.dropEffect = "move";
  };

  const handleTrackDragEnter = (e: React.DragEvent) => {
    e.preventDefault();

    // Only handle timeline clip drags
    if (!e.dataTransfer.types.includes("application/x-timeline-clip")) {
      return;
    }

    setIsDropping(true);
  };

  const handleTrackDragLeave = (e: React.DragEvent) => {
    e.preventDefault();

    // Only handle timeline clip drags
    if (!e.dataTransfer.types.includes("application/x-timeline-clip")) {
      return;
    }

    // Check if we're actually leaving the track area
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    const isActuallyLeaving =
      x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;

    if (isActuallyLeaving) {
      setIsDropping(false);
    }
  };

  const handleTrackDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropping(false);

    // Only handle timeline clip drags
    if (!e.dataTransfer.types.includes("application/x-timeline-clip")) {
      return;
    }

    const timelineClipData = e.dataTransfer.getData(
      "application/x-timeline-clip"
    );

    if (!timelineClipData) {
      return;
    }

    try {
      const parsedData = JSON.parse(timelineClipData);
      const { clipId, trackId: fromTrackId } = parsedData;

      // Calculate where to insert the clip based on mouse position
      const trackContainer = e.currentTarget.querySelector(
        ".track-clips-container"
      ) as HTMLElement;

      if (!trackContainer) {
        return;
      }

      const rect = trackContainer.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;

      // Calculate insertion index based on position
      let insertIndex = 0;
      const clipElements = trackContainer.querySelectorAll(".timeline-clip");

      for (let i = 0; i < clipElements.length; i++) {
        const clipRect = clipElements[i].getBoundingClientRect();
        const clipCenterX = clipRect.left + clipRect.width / 2 - rect.left;

        if (mouseX > clipCenterX) {
          insertIndex = i + 1;
        } else {
          break;
        }
      }

      if (fromTrackId === track.id) {
        // Moving within the same track - reorder
        const currentIndex = track.clips.findIndex(
          (clip) => clip.id === clipId
        );

        if (currentIndex !== -1 && currentIndex !== insertIndex) {
          // Adjust index if we're moving to a position after the current one
          const adjustedIndex =
            insertIndex > currentIndex ? insertIndex - 1 : insertIndex;

          reorderClipInTrack(track.id, clipId, adjustedIndex);
        }
      } else {
        // Moving between different tracks
        moveClipToTrack(fromTrackId, track.id, clipId, insertIndex);
        toast.success("Clip moved to different track");
      }
    } catch (error) {
      console.error("Error moving clip:", error);
      toast.error("Failed to move clip");
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

  const renderClipContent = (clip: any) => {
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

  return (
    <div className="flex items-center px-2">
      <div className="w-24 text-xs text-muted-foreground flex-shrink-0 mr-2">
        {track.name}
      </div>

      <div
        className={`flex-1 h-[60px] transition-colors ${
          isDropping ? "bg-accent/50 border-2 border-dashed border-accent" : ""
        }`}
        onDragOver={handleTrackDragOver}
        onDragEnter={handleTrackDragEnter}
        onDragLeave={handleTrackDragLeave}
        onDrop={handleTrackDrop}
      >
        <div className="h-full flex gap-1 track-clips-container">
          {track.clips.length === 0 ? (
            <div className="h-full w-full rounded-sm border-2 border-dashed border-muted/30 flex items-center justify-center text-xs text-muted-foreground">
              Drop media here
            </div>
          ) : (
            track.clips.map((clip, index) => (
              <div
                key={clip.id}
                className={`timeline-clip h-full rounded-sm border cursor-grab active:cursor-grabbing transition-colors ${getTrackColor(track.type)} flex items-center py-3 min-w-[80px] overflow-hidden`}
                style={{
                  width: `${Math.max(80, clip.duration * 50)}px`,
                }}
                draggable={true}
                onDragStart={(e) => handleClipDragStart(e, clip)}
              >
                {renderClipContent(clip)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

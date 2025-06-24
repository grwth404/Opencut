"use client";

import { Button } from "../../ui/button";
import {
  Scissors,
  ArrowLeftToLine,
  ArrowRightToLine,
  Trash2,
  Snowflake,
  Copy,
  SplitSquareHorizontal,
  Pause,
  Play,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "../../ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { toast } from "sonner";

interface TimelineToolbarProps {}

export function TimelineToolbar({}: TimelineToolbarProps) {
  const {
    tracks,
    addTrack,
    addClipToTrack,
    removeClipFromTrack,
    selectedClips,
    clearSelectedClips,
    updateClipTrim,
  } = useTimelineStore();
  const { currentTime, duration, isPlaying, toggle, setSpeed, speed } =
    usePlaybackStore();

  const handleSplitSelected = () => {
    if (selectedClips.length === 0) {
      toast.error("No clips selected");
      return;
    }
    selectedClips.forEach(({ trackId, clipId }) => {
      const track = tracks.find((t) => t.id === trackId);
      const clip = track?.clips.find((c) => c.id === clipId);
      if (clip && track) {
        const splitTime = currentTime;
        const effectiveStart = clip.startTime;
        const effectiveEnd =
          clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);
        if (splitTime > effectiveStart && splitTime < effectiveEnd) {
          updateClipTrim(
            track.id,
            clip.id,
            clip.trimStart,
            clip.trimEnd + (effectiveEnd - splitTime)
          );
          addClipToTrack(track.id, {
            mediaId: clip.mediaId,
            name: clip.name + " (split)",
            duration: clip.duration,
            startTime: splitTime,
            trimStart: clip.trimStart + (splitTime - effectiveStart),
            trimEnd: clip.trimEnd,
          });
        }
      }
    });
    toast.success("Split selected clip(s)");
  };

  const handleDuplicateSelected = () => {
    if (selectedClips.length === 0) {
      toast.error("No clips selected");
      return;
    }
    selectedClips.forEach(({ trackId, clipId }) => {
      const track = tracks.find((t) => t.id === trackId);
      const clip = track?.clips.find((c) => c.id === clipId);
      if (clip && track) {
        addClipToTrack(track.id, {
          mediaId: clip.mediaId,
          name: clip.name + " (copy)",
          duration: clip.duration,
          startTime:
            clip.startTime +
            (clip.duration - clip.trimStart - clip.trimEnd) +
            0.1,
          trimStart: clip.trimStart,
          trimEnd: clip.trimEnd,
        });
      }
    });
    toast.success("Duplicated selected clip(s)");
  };

  const handleFreezeSelected = () => {
    if (selectedClips.length === 0) {
      toast.error("No clips selected");
      return;
    }
    selectedClips.forEach(({ trackId, clipId }) => {
      const track = tracks.find((t) => t.id === trackId);
      const clip = track?.clips.find((c) => c.id === clipId);
      if (clip && track) {
        // Add a new freeze frame clip at the playhead
        addClipToTrack(track.id, {
          mediaId: clip.mediaId,
          name: clip.name + " (freeze)",
          duration: 1, // 1 second freeze frame
          startTime: currentTime,
          trimStart: 0,
          trimEnd: clip.duration - 1,
        });
      }
    });
    toast.success("Freeze frame added for selected clip(s)");
  };

  const handleDeleteSelected = () => {
    if (selectedClips.length === 0) {
      toast.error("No clips selected");
      return;
    }
    selectedClips.forEach(({ trackId, clipId }) => {
      removeClipFromTrack(trackId, clipId);
    });
    clearSelectedClips();
    toast.success("Deleted selected clip(s)");
  };

  return (
    <div className="border-b flex items-center px-2 py-1 gap-1">
      <TooltipProvider delayDuration={500}>
        {/* Play/Pause Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="text"
              size="icon"
              onClick={toggle}
              className="mr-2"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isPlaying ? "Pause (Space)" : "Play (Space)"}
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Time Display */}
        <div className="text-xs text-muted-foreground font-mono px-2">
          {Math.floor(currentTime * 10) / 10}s /{" "}
          {Math.floor(duration * 10) / 10}s
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Test Clip Button - for debugging */}
        {tracks.length === 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const trackId = addTrack("video");
                  addClipToTrack(trackId, {
                    mediaId: "test",
                    name: "Test Clip",
                    duration: 5,
                    startTime: 0,
                    trimStart: 0,
                    trimEnd: 0,
                  });
                }}
                className="text-xs"
              >
                Add Test Clip
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add a test clip to try playback</TooltipContent>
          </Tooltip>
        )}

        <div className="w-px h-6 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="text" size="icon" onClick={handleSplitSelected}>
              <Scissors className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split clip (S)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="text" size="icon">
              <ArrowLeftToLine className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split and keep left (A)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="text" size="icon">
              <ArrowRightToLine className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split and keep right (D)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="text" size="icon">
              <SplitSquareHorizontal className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Separate audio (E)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="text"
              size="icon"
              onClick={handleDuplicateSelected}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Duplicate clip (Ctrl+D)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="text" size="icon" onClick={handleFreezeSelected}>
              <Snowflake className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Freeze frame (F)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="text" size="icon" onClick={handleDeleteSelected}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete clip (Delete)</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Speed Control */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Select
              value={speed.toFixed(1)}
              onValueChange={(value) => setSpeed(parseFloat(value))}
            >
              <SelectTrigger className="w-[90px] h-8">
                <SelectValue placeholder="1.0x" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="1.0">1.0x</SelectItem>
                <SelectItem value="1.5">1.5x</SelectItem>
                <SelectItem value="2.0">2.0x</SelectItem>
              </SelectContent>
            </Select>
          </TooltipTrigger>
          <TooltipContent>Playback Speed</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

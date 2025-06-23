"use client";

import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { ImageTimelineTreatment } from "@/components/ui/image-timeline-treatment";
import { VideoPlayer } from "@/components/ui/video-player";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

export function PreviewPanel() {
  const { tracks } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { isPlaying, toggle } = usePlaybackStore();

  const firstClip = tracks[0]?.clips[0];
  const firstMediaItem = firstClip
    ? mediaItems.find((item) => item.id === firstClip.mediaId)
    : null;

  const aspectRatio = firstMediaItem?.aspectRatio || 16 / 9;

  const renderContent = () => {
    if (!firstMediaItem) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50">
          Drop media to start editing
        </div>
      );
    }

    if (firstMediaItem.type === "video") {
      return (
        <VideoPlayer
          src={firstMediaItem.url}
          poster={firstMediaItem.thumbnailUrl}
          className="w-full h-full"
        />
      );
    }

    if (firstMediaItem.type === "image") {
      return (
        <ImageTimelineTreatment
          src={firstMediaItem.url}
          alt={firstMediaItem.name}
          targetAspectRatio={aspectRatio}
          className="w-full h-full"
          backgroundType="blur"
        />
      );
    }

    if (firstMediaItem.type === "audio") {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-500/20 to-emerald-500/20">
          <div className="text-center">
            <div className="text-6xl mb-4">🎵</div>
            <p className="text-muted-foreground">{firstMediaItem.name}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={toggle}
            >
              {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {isPlaying ? "Pause" : "Play"}
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 overflow-hidden">
      <div
        className="bg-black rounded-lg shadow-lg relative overflow-hidden flex-shrink-0"
        style={{
          aspectRatio: aspectRatio.toString(),
          width: aspectRatio > 1 ? "100%" : "auto",
          height: aspectRatio <= 1 ? "100%" : "auto",
          maxWidth: "100%",
          maxHeight: "100%",
        }}
      >
        {renderContent()}
      </div>

      {firstMediaItem && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            {firstMediaItem.name}
          </p>
          <p className="text-xs text-muted-foreground/70">
            {aspectRatio.toFixed(2)} • {aspectRatio > 1 ? "Landscape" : aspectRatio < 1 ? "Portrait" : "Square"}
          </p>
        </div>
      )}
    </div>
  );
}

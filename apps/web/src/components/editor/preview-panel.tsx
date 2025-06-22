"use client";

import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { ImageTimelineTreatment } from "@/components/ui/image-timeline-treatment";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { useState } from "react";

export function PreviewPanel() {
  const { tracks } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const [isPlaying, setIsPlaying] = useState(false);

  // Get the first clip from the first track for preview (simplified for now)
  const firstClip = tracks[0]?.clips[0];
  const firstMediaItem = firstClip
    ? mediaItems.find((item) => item.id === firstClip.mediaId)
    : null;

  const renderPreviewContent = () => {
    if (!firstMediaItem) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50 group-hover:text-muted-foreground/80 transition-colors">
          Drop media here or click to import
        </div>
      );
    }

    if (firstMediaItem.type === "image") {
      return (
        <ImageTimelineTreatment
          src={firstMediaItem.url}
          alt={firstMediaItem.name}
          targetAspectRatio={16 / 9}
          className="w-full h-full rounded-lg"
          backgroundType="blur"
        />
      );
    }

    if (firstMediaItem.type === "video") {
      return firstMediaItem.thumbnailUrl ? (
        <img
          src={firstMediaItem.thumbnailUrl}
          alt={firstMediaItem.name}
          className="w-full h-full object-cover rounded-lg"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50">
          Video Preview
        </div>
      );
    }

    if (firstMediaItem.type === "audio") {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-500/20 to-emerald-500/20">
          <div className="text-center">
            <div className="text-6xl mb-4">🎵</div>
            <p className="text-muted-foreground">{firstMediaItem.name}</p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <div className="aspect-video bg-black/90 w-full max-w-4xl rounded-lg shadow-lg relative group overflow-hidden">
        {renderPreviewContent()}

        {/* Playback Controls Overlay */}
        {firstMediaItem && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 bg-black/80 rounded-lg px-4 py-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              <span className="text-white text-sm">
                {firstClip?.name || "No clip selected"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Preview Info */}
      {firstMediaItem && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Preview: {firstMediaItem.name}
            {firstMediaItem.type === "image" &&
              " (with CapCut-style treatment)"}
          </p>
        </div>
      )}
    </div>
  );
}

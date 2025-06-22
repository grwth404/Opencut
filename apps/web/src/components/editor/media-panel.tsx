"use client";

import { Button } from "../ui/button";
import { AspectRatio } from "../ui/aspect-ratio";
import { useMediaStore } from "@/stores/media-store";
import { Plus, Image, Video, Music, Upload } from "lucide-react";
import { useState, useRef } from "react";

export function MediaPanel() {
  const { mediaItems, addMediaItem } = useMediaStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  const handleAddSampleMedia = () => {
    // Just for testing - add a sample media item
    addMediaItem({
      name: `Sample ${mediaItems.length + 1}`,
      type: "image",
    });
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "audio":
        return <Music className="h-4 w-4" />;
      default:
        return <Image className="h-4 w-4" />;
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
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
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    dragCounterRef.current = 0;
    // TODO: Handle file drop functionality
  };

  return (
    <div
      className={`h-full overflow-y-auto transition-colors duration-200 relative ${
        isDragOver ? "bg-accent/30 border-accent" : ""
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-accent/20 backdrop-blur-lg border-2 border-dashed border-accent rounded-lg flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center">
            <Upload className="h-8 w-8 text-accent mx-auto mb-2" />
            <p className="text-sm font-medium text-accent">Drop files here</p>
            <p className="text-xs text-muted-foreground">
              Images, videos, and audio files
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4 p-2 h-full">
        {/* Media Grid */}
        {mediaItems.length === 0 ? (
          <EmptyMedia onAddSample={handleAddSampleMedia} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {mediaItems.map((item) => (
              <Button
                key={item.id}
                variant="outline"
                className="flex flex-col gap-2 p-2 h-auto overflow-hidden"
              >
                <AspectRatio ratio={16 / 9} className="w-full">
                  <div className="w-full h-full bg-muted/30 flex flex-col items-center justify-center text-muted-foreground">
                    {getMediaIcon(item.type)}
                    <span className="text-xs mt-1 truncate max-w-full px-1">
                      {item.name}
                    </span>
                  </div>
                </AspectRatio>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyMedia({ onAddSample }: { onAddSample: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center h-full">
      <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
        <Image className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">No media in project</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        Drag files or click to add media
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={onAddSample}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Sample
      </Button>
    </div>
  );
}

"use client";

import { Button } from "../ui/button";
import { AspectRatio } from "../ui/aspect-ratio";
import { DragOverlay } from "../ui/drag-overlay";
import { useMediaStore } from "@/stores/media-store";
import { processMediaFiles } from "@/lib/media-processing";
import { Plus, Image, Video, Music, Trash2, Upload } from "lucide-react";
import { useDragDrop } from "@/hooks/use-drag-drop";
import { useRef, useState } from "react";
import { toast } from "sonner";

export function MediaPanel() {
  const { mediaItems, addMediaItem, removeMediaItem } = useMediaStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFiles = async (files: FileList | File[]) => {
    setIsProcessing(true);

    try {
      const processedItems = await processMediaFiles(files);

      for (const processedItem of processedItems) {
        addMediaItem(processedItem);
        toast.success(`Added ${processedItem.name} to project`);
      }
    } catch (error) {
      console.error("Error processing files:", error);
      toast.error("Failed to process files");
    } finally {
      setIsProcessing(false);
    }
  };

  const { isDragOver, dragProps } = useDragDrop({
    onDrop: (files) => {
      processFiles(files);
    },
  });

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset the input so the same file can be selected again
      e.target.value = "";
    }
  };

  const handleRemoveItem = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    removeMediaItem(itemId);
    toast.success("Media removed from project");
  };

  const handleDragStart = (e: React.DragEvent, item: any) => {
    // Mark this as an internal app drag
    e.dataTransfer.setData(
      "application/x-media-item",
      JSON.stringify({
        id: item.id,
        type: item.type,
        name: item.name,
      })
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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

  const renderMediaPreview = (item: any) => {
    switch (item.type) {
      case "image":
        return (
          <img
            src={item.url}
            alt={item.name}
            className="w-full h-full object-cover rounded cursor-grab active:cursor-grabbing"
            loading="lazy"
            draggable={true}
            onDragStart={(e) => handleDragStart(e, item)}
          />
        );
      case "video":
        return item.thumbnailUrl ? (
          <div className="relative w-full h-full">
            <img
              src={item.thumbnailUrl}
              alt={item.name}
              className="w-full h-full object-cover rounded cursor-grab active:cursor-grabbing"
              loading="lazy"
              draggable={true}
              onDragStart={(e) => handleDragStart(e, item)}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded">
              <Video className="h-6 w-6 text-white drop-shadow-md" />
            </div>
            {item.duration && (
              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                {formatDuration(item.duration)}
              </div>
            )}
          </div>
        ) : (
          <div
            className="w-full h-full bg-muted/30 flex flex-col items-center justify-center text-muted-foreground rounded cursor-grab active:cursor-grabbing"
            draggable={true}
            onDragStart={(e) => handleDragStart(e, item)}
          >
            <Video className="h-6 w-6 mb-1" />
            <span className="text-xs">Video</span>
            {item.duration && (
              <span className="text-xs opacity-70">
                {formatDuration(item.duration)}
              </span>
            )}
          </div>
        );
      case "audio":
        return (
          <div
            className="w-full h-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex flex-col items-center justify-center text-muted-foreground rounded border border-green-500/20 cursor-grab active:cursor-grabbing"
            draggable={true}
            onDragStart={(e) => handleDragStart(e, item)}
          >
            <Music className="h-6 w-6 mb-1" />
            <span className="text-xs">Audio</span>
            {item.duration && (
              <span className="text-xs opacity-70">
                {formatDuration(item.duration)}
              </span>
            )}
          </div>
        );
      default:
        return (
          <div
            className="w-full h-full bg-muted/30 flex flex-col items-center justify-center text-muted-foreground rounded cursor-grab active:cursor-grabbing"
            draggable={true}
            onDragStart={(e) => handleDragStart(e, item)}
          >
            {getMediaIcon(item.type)}
            <span className="text-xs mt-1">Unknown</span>
          </div>
        );
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div
        className={`h-full overflow-y-auto transition-colors duration-200 relative ${
          isDragOver ? "bg-accent/30 border-accent" : ""
        }`}
        {...dragProps}
      >
        <DragOverlay isVisible={isDragOver} />

        <div className="space-y-4 p-2 h-full">
          {/* Media Grid */}
          {mediaItems.length === 0 ? (
            <EmptyMedia
              onFileSelect={handleFileSelect}
              isProcessing={isProcessing}
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {mediaItems.map((item) => (
                <div key={item.id} className="relative group">
                  <Button
                    variant="outline"
                    className="flex flex-col gap-2 p-2 h-auto overflow-hidden w-full relative"
                  >
                    <AspectRatio ratio={item.aspectRatio} className="w-full">
                      {renderMediaPreview(item)}
                    </AspectRatio>
                    <span className="text-xs truncate max-w-full px-1">
                      {item.name}
                    </span>
                  </Button>

                  {/* Remove button - positioned outside the button container */}
                  <div
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    onDragStart={(e) => e.preventDefault()}
                    onDrag={(e) => e.preventDefault()}
                  >
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-6 w-6 pointer-events-auto"
                      onClick={(e) => handleRemoveItem(e, item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function EmptyMedia({
  onFileSelect,
  isProcessing,
}: {
  onFileSelect: () => void;
  isProcessing: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center h-full">
      <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
        {isProcessing ? (
          <div className="animate-spin">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          <Image className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {isProcessing ? "Processing files..." : "No media in project"}
      </p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        {isProcessing
          ? "Please wait while files are being processed"
          : "Drag files or click to add media"}
      </p>
      {!isProcessing && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onFileSelect}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Media
        </Button>
      )}
    </div>
  );
}

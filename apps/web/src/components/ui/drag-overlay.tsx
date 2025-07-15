import { Upload, Plus, Image } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DragOverlayProps {
  isVisible: boolean;
  title?: string;
  description?: string;
  isProcessing?: boolean;
  progress?: number;
  onClick?: () => void;
  isEmptyState?: boolean;
}

export function DragOverlay({
  isVisible,
  title = "Drop files here",
  description = "Images, videos, and audio files",
  isProcessing = false,
  progress = 0,
  onClick,
  isEmptyState = false,
}: DragOverlayProps) {
  if (!isVisible) return null;

  const handleClick = (e: React.MouseEvent) => {
    if (isProcessing || !onClick) return;
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  return (
    <div
      className="flex flex-col items-center justify-center h-full min-h-[300px] text-center cursor-pointer rounded-lg border-2 border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 p-8 z-10 bg-background/50 backdrop-blur-sm"
      onClick={handleClick}
    >
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center mb-6 border border-primary/20">
        {isProcessing ? (
          <Upload className="h-10 w-10 text-primary animate-spin" />
        ) : isEmptyState ? (
          <Image className="h-10 w-10 text-primary" />
        ) : (
          <Upload className="h-10 w-10 text-primary" />
        )}
      </div>

      <div className="space-y-2 mb-6">
        <h3 className="text-lg font-medium text-foreground">
          {isProcessing ? "Processing files..." : title}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {isProcessing
            ? `Processing your files (${progress}%)`
            : description
          }
        </p>
      </div>

      {!isProcessing && (
        <div className="flex flex-col items-center gap-3">
          <Button
            variant="default"
            size="lg"
            onClick={handleClick}
            className="gap-2 px-6"
          >
            <Plus className="h-5 w-5" />
            {isEmptyState ? "Choose Files" : "Browse Files"}
          </Button>
          <p className="text-xs text-muted-foreground/60">
            {isEmptyState
              ? "Supports images, videos, and audio files"
              : "Or drop your files here"
            }
          </p>
        </div>
      )}

      {isProcessing && (
        <div className="w-full max-w-xs">
          <div className="w-full bg-muted/50 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

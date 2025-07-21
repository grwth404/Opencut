"use client";

import { useTimelineStore } from "@/stores/timeline-store";
import { TimelineElement, TimelineTrack } from "@/types/timeline";
import { useMediaStore, type MediaItem } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useEditorStore } from "@/stores/editor-store";
import { useAspectRatio } from "@/hooks/use-aspect-ratio";
import { VideoPlayer } from "@/components/ui/video-player";
import { AudioPlayer } from "@/components/ui/audio-player";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Play, Pause, Expand, SkipBack, SkipForward } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { formatTimeCode } from "@/lib/time";
import { FONT_CLASS_MAP } from "@/lib/font-config";
import { BackgroundSettings } from "../background-settings";
import { useProjectStore } from "@/stores/project-store";

interface ActiveElement {
  element: TimelineElement;
  track: TimelineTrack;
  mediaItem: MediaItem | null;
}

export function PreviewPanel() {
  const { tracks, getTotalDuration } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { currentTime, toggle, setCurrentTime, pause } = usePlaybackStore();
  const { canvasSize } = useEditorStore();
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewDimensions, setPreviewDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const { activeProject } = useProjectStore();

  // Calculate optimal preview size that fits in container while maintaining aspect ratio
  useEffect(() => {
    const updatePreviewSize = () => {
      if (!containerRef.current) return;

      let container;
      let availableWidth, availableHeight;

      if (isExpanded) {
        // Use full viewport when expanded
        availableWidth = window.innerWidth;
        availableHeight = window.innerHeight;
      } else {
        container = containerRef.current.getBoundingClientRect();
        const computedStyle = getComputedStyle(containerRef.current);

        // Get padding values
        const paddingTop = parseFloat(computedStyle.paddingTop);
        const paddingBottom = parseFloat(computedStyle.paddingBottom);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);

        // Get gap value (gap-4 = 1rem = 16px)
        const gap = parseFloat(computedStyle.gap) || 16;

        // Get toolbar height if it exists
        const toolbar = containerRef.current.querySelector("[data-toolbar]");
        const toolbarHeight = toolbar
          ? toolbar.getBoundingClientRect().height
          : 0;

        // Calculate available space after accounting for padding, gap, and toolbar
        availableWidth = container.width - paddingLeft - paddingRight;
        availableHeight =
          container.height -
          paddingTop -
          paddingBottom -
          toolbarHeight -
          (toolbarHeight > 0 ? gap : 0);
      }

      const targetRatio = canvasSize.width / canvasSize.height;
      const containerRatio = availableWidth / availableHeight;

      let width, height;

      if (containerRatio > targetRatio) {
        // Container is wider - constrain by height
        height = availableHeight * (isExpanded ? 0.9 : 1); // Leave some margin when expanded
        width = height * targetRatio;
      } else {
        // Container is taller - constrain by width
        width = availableWidth * (isExpanded ? 0.9 : 1); // Leave some margin when expanded
        height = width / targetRatio;
      }

      setPreviewDimensions({ width, height });
    };

    updatePreviewSize();

    const resizeObserver = new ResizeObserver(updatePreviewSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Listen for window resize when expanded
    if (isExpanded) {
      window.addEventListener("resize", updatePreviewSize);
    }

    return () => {
      resizeObserver.disconnect();
      if (isExpanded) {
        window.removeEventListener("resize", updatePreviewSize);
      }
    };
  }, [canvasSize.width, canvasSize.height, isExpanded]);

  // Handle escape key to exit expanded mode
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isExpanded) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener("keydown", handleEscapeKey);
      // Prevent body scroll when expanded
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "";
    };
  }, [isExpanded]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Check if there are any elements in the timeline at all
  const hasAnyElements = tracks.some((track) => track.elements.length > 0);

  // Handle keyboard shortcuts for timeline navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when preview panel is focused or no input is focused
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.contentEditable === "true";

      if (isInputFocused) return;

      switch (event.key) {
        case " ":
          event.preventDefault();
          if (hasAnyElements) {
            toggle();
          }
          break;
        case "ArrowLeft":
          event.preventDefault();
          if (hasAnyElements) {
            pause();
            const frameTime = 1 / (activeProject?.fps || 30);
            const newTime = Math.max(
              0,
              currentTime - (event.shiftKey ? frameTime : 1),
            );
            setCurrentTime(newTime);
          }
          break;
        case "ArrowRight":
          event.preventDefault();
          if (hasAnyElements) {
            pause();
            const frameTime = 1 / (activeProject?.fps || 30);
            const totalDuration = getTotalDuration();
            const newTime = Math.min(
              totalDuration,
              currentTime + (event.shiftKey ? frameTime : 1),
            );
            setCurrentTime(newTime);
          }
          break;
        case "Home":
          event.preventDefault();
          if (hasAnyElements) {
            setCurrentTime(0);
          }
          break;
        case "End":
          event.preventDefault();
          if (hasAnyElements) {
            setCurrentTime(getTotalDuration());
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    hasAnyElements,
    toggle,
    currentTime,
    setCurrentTime,
    activeProject?.fps,
    getTotalDuration,
    toggle,
  ]);

  // Get active elements at current time
  const getActiveElements = (): ActiveElement[] => {
    const activeElements: ActiveElement[] = [];

    tracks.forEach((track) => {
      track.elements.forEach((element) => {
        const elementStart = element.startTime;
        const elementEnd =
          element.startTime +
          (element.duration - element.trimStart - element.trimEnd);

        if (currentTime >= elementStart && currentTime < elementEnd) {
          let mediaItem = null;

          // Only get media item for media elements
          if (element.type === "media") {
            mediaItem =
              element.mediaId === "test"
                ? null // Test elements don't have a real media item
                : mediaItems.find((item) => item.id === element.mediaId) ||
                  null;
          }

          activeElements.push({ element, track, mediaItem });
        }
      });
    });

    return activeElements;
  };

  const activeElements = getActiveElements();

  // Get media elements for blur background (video/image only)
  const getBlurBackgroundElements = (): ActiveElement[] => {
    return activeElements.filter(
      ({ element, mediaItem }) =>
        element.type === "media" &&
        mediaItem &&
        (mediaItem.type === "video" || mediaItem.type === "image") &&
        element.mediaId !== "test", // Exclude test elements
    );
  };

  const blurBackgroundElements = getBlurBackgroundElements();

  // Render blur background layer
  const renderBlurBackground = () => {
    if (
      !activeProject?.backgroundType ||
      activeProject.backgroundType !== "blur" ||
      blurBackgroundElements.length === 0
    ) {
      return null;
    }

    // Use the first media element for background (could be enhanced to use primary/focused element)
    const backgroundElement = blurBackgroundElements[0];
    const { element, mediaItem } = backgroundElement;

    if (!mediaItem) return null;

    const blurIntensity = activeProject.blurIntensity || 8;

    if (mediaItem.type === "video") {
      return (
        <div
          key={`blur-${element.id}`}
          className="absolute inset-0 overflow-hidden"
          style={{
            filter: `blur(${blurIntensity}px)`,
            transform: "scale(1.1)", // Slightly zoom to avoid blur edge artifacts
            transformOrigin: "center",
          }}
        >
          <VideoPlayer
            src={mediaItem.url!}
            poster={mediaItem.thumbnailUrl}
            clipStartTime={element.startTime}
            trimStart={element.trimStart}
            trimEnd={element.trimEnd}
            clipDuration={element.duration}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    if (mediaItem.type === "image") {
      return (
        <div
          key={`blur-${element.id}`}
          className="absolute inset-0 overflow-hidden"
          style={{
            filter: `blur(${blurIntensity}px)`,
            transform: "scale(1.1)", // Slightly zoom to avoid blur edge artifacts
            transformOrigin: "center",
          }}
        >
          <img
            src={mediaItem.url!}
            alt={mediaItem.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      );
    }

    return null;
  };

  // Render an element
  const renderElement = (elementData: ActiveElement, index: number) => {
    const { element, mediaItem } = elementData;

    // Text elements
    if (element.type === "text") {
      const fontClassName =
        FONT_CLASS_MAP[element.fontFamily as keyof typeof FONT_CLASS_MAP] || "";

      const scaleRatio = previewDimensions.width / canvasSize.width;

      return (
        <div
          key={element.id}
          className="absolute flex items-center justify-center"
          style={{
            left: `${50 + (element.x / canvasSize.width) * 100}%`,
            top: `${50 + (element.y / canvasSize.height) * 100}%`,
            transform: `translate(-50%, -50%) rotate(${element.rotation}deg) scale(${scaleRatio})`,
            opacity: element.opacity,
            zIndex: 100 + index, // Text elements on top
          }}
        >
          <div
            className={fontClassName}
            style={{
              fontSize: `${element.fontSize}px`,
              color: element.color,
              backgroundColor: element.backgroundColor,
              textAlign: element.textAlign,
              fontWeight: element.fontWeight,
              fontStyle: element.fontStyle,
              textDecoration: element.textDecoration,
              padding: "4px 8px",
              borderRadius: "2px",
              whiteSpace: "nowrap",
              // Fallback for system fonts that don't have classes
              ...(fontClassName === "" && { fontFamily: element.fontFamily }),
            }}
          >
            {element.content}
          </div>
        </div>
      );
    }

    // Media elements
    if (element.type === "media") {
      // Test elements
      if (!mediaItem || element.mediaId === "test") {
        return (
          <div
            key={element.id}
            className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">🎬</div>
              <p className="text-xs text-white">{element.name}</p>
            </div>
          </div>
        );
      }

      // Video elements
      if (mediaItem.type === "video") {
        return (
          <div
            key={element.id}
            className="absolute inset-0 flex items-center justify-center"
          >
            <VideoPlayer
              src={mediaItem.url!}
              poster={mediaItem.thumbnailUrl}
              clipStartTime={element.startTime}
              trimStart={element.trimStart}
              trimEnd={element.trimEnd}
              clipDuration={element.duration}
            />
          </div>
        );
      }

      // Image elements
      if (mediaItem.type === "image") {
        return (
          <div
            key={element.id}
            className="absolute inset-0 flex items-center justify-center"
          >
            <img
              src={mediaItem.url!}
              alt={mediaItem.name}
              className="max-w-full max-h-full object-contain"
              draggable={false}
            />
          </div>
        );
      }

      // Audio elements (no visual representation)
      if (mediaItem.type === "audio") {
        return (
          <div key={element.id} className="absolute inset-0">
            <AudioPlayer
              src={mediaItem.url!}
              clipStartTime={element.startTime}
              trimStart={element.trimStart}
              trimEnd={element.trimEnd}
              clipDuration={element.duration}
              trackMuted={elementData.track.muted}
            />
          </div>
        );
      }
    }

    return null;
  };

  return (
    <>
      <div className="h-full w-full flex flex-col min-h-0 min-w-0 bg-panel rounded-sm">
        <div
          ref={containerRef}
          className="flex-1 flex flex-col items-center justify-center p-3 min-h-0 min-w-0"
        >
          <div className="flex-1"></div>
          {hasAnyElements ? (
            <div
              ref={previewRef}
              className="relative overflow-hidden border"
              style={{
                width: previewDimensions.width,
                height: previewDimensions.height,
                backgroundColor:
                  activeProject?.backgroundType === "blur"
                    ? "transparent"
                    : activeProject?.backgroundColor || "#000000",
              }}
            >
              {renderBlurBackground()}
              {activeElements.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  No elements at current time
                </div>
              ) : (
                activeElements.map((elementData, index) =>
                  renderElement(elementData, index),
                )
              )}
              {/* Show message when blur is selected but no media available */}
              {activeProject?.backgroundType === "blur" &&
                blurBackgroundElements.length === 0 &&
                activeElements.length > 0 && (
                  <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-xs p-2 rounded">
                    Add a video or image to use blur background
                  </div>
                )}
            </div>
          ) : null}

          <div className="flex-1"></div>

          <PreviewToolbar
            hasAnyElements={hasAnyElements}
            onToggleExpanded={toggleExpanded}
            isExpanded={isExpanded}
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
            toggle={toggle}
            getTotalDuration={getTotalDuration}
            pause={pause}
          />
        </div>
      </div>

      {/* Expanded/Fullscreen Mode */}
      {isExpanded && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div
              className="relative overflow-hidden"
              style={{
                width: previewDimensions.width,
                height: previewDimensions.height,
                backgroundColor:
                  activeProject?.backgroundType === "blur"
                    ? "transparent"
                    : activeProject?.backgroundColor || "#000000",
              }}
            >
              {renderBlurBackground()}
              {activeElements.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  No elements at current time
                </div>
              ) : (
                activeElements.map((elementData, index) =>
                  renderElement(elementData, index),
                )
              )}
              {/* Show message when blur is selected but no media available */}
              {activeProject?.backgroundType === "blur" &&
                blurBackgroundElements.length === 0 &&
                activeElements.length > 0 && (
                  <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-xs p-2 rounded">
                    Add a video or image to use blur background
                  </div>
                )}
            </div>
          </div>
          <div className="p-4">
            <PreviewToolbar
              hasAnyElements={hasAnyElements}
              onToggleExpanded={toggleExpanded}
              isExpanded={isExpanded}
              currentTime={currentTime}
              setCurrentTime={setCurrentTime}
              toggle={toggle}
              getTotalDuration={getTotalDuration}
              pause={pause}
            />
          </div>
        </div>
      )}
    </>
  );
}

function PreviewToolbar({
  hasAnyElements,
  onToggleExpanded,
  isExpanded,
  currentTime,
  setCurrentTime,
  toggle,
  getTotalDuration,
  pause,
}: {
  hasAnyElements: boolean;
  onToggleExpanded: () => void;
  isExpanded: boolean;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  toggle: () => void;
  getTotalDuration: () => number;
  pause: () => void;
}) {
  const { isPlaying } = usePlaybackStore();
  const { setCanvasSize, setCanvasSizeToOriginal } = useEditorStore();
  const { activeProject } = useProjectStore();
  const {
    currentPreset,
    isOriginal,
    getOriginalAspectRatio,
    getDisplayName,
    canvasPresets,
  } = useAspectRatio();

  const handlePresetSelect = (preset: { width: number; height: number }) => {
    setCanvasSize({ width: preset.width, height: preset.height });
  };

  const handleOriginalSelect = () => {
    const aspectRatio = getOriginalAspectRatio();
    setCanvasSizeToOriginal(aspectRatio);
  };

  const totalDuration = getTotalDuration();
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    pause();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * totalDuration;
    setCurrentTime(Math.max(0, Math.min(newTime, totalDuration)));
  };

  const handleTimelineDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    pause();
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const dragX = moveEvent.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, dragX / rect.width));
      const newTime = percentage * totalDuration;
      setCurrentTime(Math.max(0, Math.min(newTime, totalDuration)));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const skipBackward = () => {
    pause();
    const newTime = Math.max(0, currentTime - 1); // Skip 1 second back
    setCurrentTime(newTime);
  };

  const skipForward = () => {
    pause();
    const newTime = Math.min(totalDuration, currentTime + 1); // Skip 1 second forward
    setCurrentTime(newTime);
  };

  return (
    <div data-toolbar className="flex items-center gap-2 p-1 pt-2 w-full">
      {/* Time Display */}
      <div className="flex items-center gap-1 text-[0.70rem] text-muted-foreground tabular-nums">
        <span className="text-primary">
          {formatTimeCode(currentTime, "HH:MM:SS:FF", activeProject?.fps || 30)}
        </span>
        <span className="opacity-50">/</span>
        <span>
          {formatTimeCode(
            totalDuration,
            "HH:MM:SS:FF",
            activeProject?.fps || 30,
          )}
        </span>
      </div>

      {/* Transport Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="text"
          size="icon"
          onClick={skipBackward}
          disabled={!hasAnyElements}
          className="h-auto p-0"
          title="Skip backward 1s"
        >
          <SkipBack className="h-3 w-3" />
        </Button>
        <Button
          variant="text"
          size="icon"
          onClick={toggle}
          disabled={!hasAnyElements}
          className="h-auto p-0"
        >
          {isPlaying ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="text"
          size="icon"
          onClick={skipForward}
          disabled={!hasAnyElements}
          className="h-auto p-0"
          title="Skip forward 1s"
        >
          <SkipForward className="h-3 w-3" />
        </Button>
      </div>

      {/* Timeline Scrubber */}
      <div className="flex-1 flex items-center gap-2">
        <div
          className={cn(
            "relative h-1 bg-muted rounded-full cursor-pointer flex-1",
            !hasAnyElements && "opacity-50 cursor-not-allowed",
          )}
          onClick={hasAnyElements ? handleTimelineClick : undefined}
          onMouseDown={hasAnyElements ? handleTimelineDrag : undefined}
        >
          <div
            className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 w-3 h-3 bg-primary rounded-full -translate-y-1/2 -translate-x-1/2 shadow-sm border border-background"
            style={{ left: `${progress}%` }}
          />
        </div>
      </div>

      {/* Aspect Ratio and Fullscreen Controls */}
      <div className="flex items-center gap-3">
        {!isExpanded && (
          <>
            <BackgroundSettings />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="!bg-panel-accent text-foreground/85 text-[0.70rem] h-4 rounded-none border border-muted-foreground px-0.5 py-0 font-light"
                  disabled={!hasAnyElements}
                >
                  {getDisplayName()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleOriginalSelect}
                  className={cn("text-xs", isOriginal && "font-semibold")}
                >
                  Original
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {canvasPresets.map((preset) => (
                  <DropdownMenuItem
                    key={preset.name}
                    onClick={() => handlePresetSelect(preset)}
                    className={cn(
                      "text-xs",
                      currentPreset?.name === preset.name && "font-semibold",
                    )}
                  >
                    {preset.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        <Button
          variant="text"
          size="icon"
          className="!size-4 text-muted-foreground"
          onClick={onToggleExpanded}
          title={isExpanded ? "Exit fullscreen (Esc)" : "Enter fullscreen"}
        >
          <Expand className="!size-4" />
        </Button>
      </div>
    </div>
  );
}

import {
  Output,
  Mp4OutputFormat,
  WebMOutputFormat,
  BufferTarget,
  CanvasSource,
  QUALITY_LOW,
  QUALITY_MEDIUM,
  QUALITY_HIGH,
  QUALITY_VERY_HIGH,
} from "mediabunny";
import { renderTimelineFrame } from "./timeline-renderer";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { DEFAULT_FPS } from "@/stores/project-store";
import { ExportOptions, ExportResult } from "@/types/export";

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: "mp4",
  quality: "high",
};

const qualityMap = {
  low: QUALITY_LOW,
  medium: QUALITY_MEDIUM,
  high: QUALITY_HIGH,
  very_high: QUALITY_VERY_HIGH,
};

export async function exportProject(
  options: ExportOptions
): Promise<ExportResult> {
  const { format, quality, fps, onProgress, onCancel } = options;

  try {
    const timelineStore = useTimelineStore.getState();
    const mediaStore = useMediaStore.getState();
    const projectStore = useProjectStore.getState();

    const { tracks, getTotalDuration } = timelineStore;
    const { mediaFiles } = mediaStore;
    const { activeProject } = projectStore;

    if (!activeProject) {
      return { success: false, error: "No active project" };
    }

    const duration = getTotalDuration();
    if (duration === 0) {
      return { success: false, error: "Project is empty" };
    }

    const exportFps = fps || activeProject.fps || DEFAULT_FPS;
    const canvasSize = activeProject.canvasSize;

    const outputFormat =
      format === "webm" ? new WebMOutputFormat() : new Mp4OutputFormat();

    // BufferTarget for smaller files, StreamTarget for larger ones
    // TODO: Implement StreamTarget
    const output = new Output({
      format: outputFormat,
      target: new BufferTarget(),
    });

    // Canvas for rendering
    const canvas = document.createElement("canvas");
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return { success: false, error: "Failed to create canvas context" };
    }

    const videoSource = new CanvasSource(canvas, {
      codec: format === "webm" ? "vp9" : "avc", // VP9 for WebM, H.264 for MP4
      bitrate: qualityMap[quality],
    });

    output.addVideoTrack(videoSource, { frameRate: exportFps });

    // Start the output
    await output.start();

    const totalFrames = Math.ceil(duration * exportFps);
    let cancelled = false;

    // Render each frame
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      // Check for cancellation
      if (onCancel?.()) {
        cancelled = true;
        break;
      }

      const time = frameIndex / exportFps;

      await renderTimelineFrame({
        ctx,
        time,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        tracks,
        mediaFiles,
        backgroundColor:
          activeProject.backgroundType === "blur"
            ? "transparent"
            : activeProject.backgroundColor || "#000000",
        projectCanvasSize: canvasSize,
      });

      const frameDuration = 1 / exportFps;
      await videoSource.add(time, frameDuration);

      onProgress?.(frameIndex / totalFrames);
    }

    if (cancelled) {
      await output.cancel();
      return { success: false, cancelled: true };
    }
    videoSource.close();
    await output.finalize();
    onProgress?.(1);

    return {
      success: true,
      buffer: output.target.buffer || undefined,
    };
  } catch (error) {
    console.error("Export failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown export error",
    };
  }
}

export function getExportMimeType(format: "mp4" | "webm"): string {
  return format === "webm" ? "video/webm" : "video/mp4";
}

export function getExportFileExtension(format: "mp4" | "webm"): string {
  return `.${format}`;
}

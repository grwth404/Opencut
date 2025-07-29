import { FFmpeg } from "@ffmpeg/ffmpeg";
import { initFFmpeg } from "./ffmpeg-utils";
import { TimelineTrack, TimelineElement } from "@/types/timeline";
import { MediaItem } from "@/stores/media-store";
import { TProject } from "@/types/project";

export interface ExportOptions {
  format: "mp4" | "webm" | "mov";
  quality: "low" | "medium" | "high";
  resolution: "720p" | "1080p" | "4k";
  fps: number;
}

export interface ExportProgress {
  phase: "preparing" | "processing" | "finalizing" | "complete";
  progress: number; // 0-100
  message: string;
}

export class VideoExporter {
  private ffmpeg: FFmpeg | null = null;
  private onProgress?: (progress: ExportProgress) => void;

  constructor(onProgress?: (progress: ExportProgress) => void) {
    this.onProgress = onProgress;
  }

  private updateProgress(
    phase: ExportProgress["phase"],
    progress: number,
    message: string
  ) {
    if (this.onProgress) {
      this.onProgress({ phase, progress, message });
    }
  }

  async exportProject(
    project: TProject,
    tracks: TimelineTrack[],
    mediaItems: MediaItem[],
    options: ExportOptions
  ): Promise<Blob> {
    this.updateProgress("preparing", 0, "Initializing FFmpeg...");

    this.ffmpeg = await initFFmpeg();

    // Set up progress callback for FFmpeg
    this.ffmpeg.on("progress", ({ progress }) => {
      this.updateProgress("processing", progress * 100, "Rendering video...");
    });

    try {
      this.updateProgress("preparing", 10, "Analyzing timeline...");

      // Get timeline duration
      const duration = this.calculateTimelineDuration(tracks);
      if (duration === 0) {
        throw new Error("Timeline is empty - nothing to export");
      }

      this.updateProgress("preparing", 20, "Preparing media files...");

      // Process media tracks (video/image/audio)
      const mediaTracks = tracks.filter(
        (track) => track.type === "media" || track.type === "audio"
      );

      if (mediaTracks.length === 0) {
        throw new Error("No media tracks found to export");
      }

      this.updateProgress("preparing", 40, "Setting up export parameters...");

      // Get resolution settings
      const { width, height } = this.getResolutionDimensions(
        options.resolution
      );

      // Create a simple concatenation for now
      // In a full implementation, this would handle overlays, transitions, etc.
      const outputBlob = await this.renderSimpleTimeline(
        mediaTracks,
        mediaItems,
        duration,
        options,
        width,
        height
      );

      this.updateProgress("complete", 100, "Export complete!");
      return outputBlob;
    } catch (error) {
      console.error("Export failed:", error);
      throw error;
    }
  }

  private calculateTimelineDuration(tracks: TimelineTrack[]): number {
    let maxDuration = 0;

    for (const track of tracks) {
      for (const element of track.elements) {
        const elementEnd =
          element.startTime +
          element.duration -
          element.trimStart -
          element.trimEnd;
        maxDuration = Math.max(maxDuration, elementEnd);
      }
    }

    return maxDuration;
  }

  private getResolutionDimensions(resolution: string): {
    width: number;
    height: number;
  } {
    switch (resolution) {
      case "720p":
        return { width: 1280, height: 720 };
      case "1080p":
        return { width: 1920, height: 1080 };
      case "4k":
        return { width: 3840, height: 2160 };
      default:
        return { width: 1920, height: 1080 };
    }
  }

  private async renderSimpleTimeline(
    tracks: TimelineTrack[],
    mediaItems: MediaItem[],
    duration: number,
    options: ExportOptions,
    width: number,
    height: number
  ): Promise<Blob> {
    if (!this.ffmpeg) throw new Error("FFmpeg not initialized");

    // For now, let's implement a simple case: export the first video/image element
    // A full implementation would handle complex timeline rendering

    const firstMediaTrack = tracks.find((track) => track.type === "media");
    if (!firstMediaTrack || firstMediaTrack.elements.length === 0) {
      throw new Error("No media elements found to export");
    }

    const firstElement = firstMediaTrack.elements[0];

    // Type guard to ensure we have a media element
    if (firstElement.type !== "media") {
      throw new Error("First element is not a media element");
    }

    const mediaItem = mediaItems.find(
      (item) => item.id === firstElement.mediaId
    );

    if (!mediaItem || !mediaItem.file) {
      throw new Error("Media file not found for export");
    }

    this.updateProgress("processing", 10, "Processing media file...");

    const inputName = `input.${this.getFileExtension(mediaItem.file.name)}`;
    const outputName = `output.${options.format}`;

    // Write input file
    await this.ffmpeg.writeFile(
      inputName,
      new Uint8Array(await mediaItem.file.arrayBuffer())
    );

    // Build FFmpeg command based on media type and options
    const ffmpegArgs = this.buildFFmpegCommand(
      inputName,
      outputName,
      firstElement,
      options,
      width,
      height,
      duration
    );

    this.updateProgress("processing", 30, "Rendering video...");

    // Execute FFmpeg command
    await this.ffmpeg.exec(ffmpegArgs);

    this.updateProgress("finalizing", 90, "Finalizing export...");

    // Read output file
    const data = await this.ffmpeg.readFile(outputName);
    const blob = new Blob([data], { type: `video/${options.format}` });

    // Cleanup
    await this.ffmpeg.deleteFile(inputName);
    await this.ffmpeg.deleteFile(outputName);

    return blob;
  }

  private buildFFmpegCommand(
    inputName: string,
    outputName: string,
    element: TimelineElement,
    options: ExportOptions,
    width: number,
    height: number,
    totalDuration: number
  ): string[] {
    const args = ["-i", inputName];

    // Handle trimming
    if (element.trimStart > 0) {
      args.push("-ss", element.trimStart.toString());
    }

    // Set duration
    const elementDuration =
      element.duration - element.trimStart - element.trimEnd;
    args.push("-t", Math.min(elementDuration, totalDuration).toString());

    // Set resolution and scaling
    args.push(
      "-vf",
      `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`
    );

    // Set frame rate
    args.push("-r", options.fps.toString());

    // Set quality/bitrate based on options
    const { videoBitrate, audioBitrate } = this.getQualitySettings(
      options.quality
    );
    args.push("-b:v", videoBitrate, "-b:a", audioBitrate);

    // Set codec based on format
    if (options.format === "mp4") {
      args.push("-c:v", "libx264", "-c:a", "aac");
    } else if (options.format === "webm") {
      args.push("-c:v", "libvpx-vp9", "-c:a", "libopus");
    }

    args.push(outputName);
    return args;
  }

  private getQualitySettings(quality: string): {
    videoBitrate: string;
    audioBitrate: string;
  } {
    switch (quality) {
      case "low":
        return { videoBitrate: "1M", audioBitrate: "128k" };
      case "medium":
        return { videoBitrate: "3M", audioBitrate: "192k" };
      case "high":
        return { videoBitrate: "8M", audioBitrate: "320k" };
      default:
        return { videoBitrate: "3M", audioBitrate: "192k" };
    }
  }

  private getFileExtension(filename: string): string {
    return filename.split(".").pop() || "mp4";
  }

  cleanup() {
    if (this.ffmpeg) {
      // Remove all progress listeners
      this.ffmpeg.off("progress", () => {});
    }
  }
}

// Utility function to download blob as file
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

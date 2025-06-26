import { useEffect } from "react";
import { usePlaybackStore } from "@/stores/playback-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { toast } from "sonner";

export const usePlaybackControls = () => {
  const { isPlaying, currentTime, play, pause, seek } = usePlaybackStore();

  const {
    selectedClips,
    tracks,
    splitClip,
    splitAndKeepLeft,
    splitAndKeepRight,
    separateAudio,
  } = useTimelineStore();

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          if (isPlaying) {
            pause();
          } else {
            play();
          }
          break;

        case "s":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleSplitSelectedClip();
          }
          break;

        case "q":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleSplitAndKeepLeft();
          }
          break;

        case "w":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleSplitAndKeepRight();
          }
          break;

        case "d":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleSeparateAudio();
          }
          break;
      }
    };

    const handleSplitSelectedClip = () => {
      if (selectedClips.length !== 1) {
        toast.error("Select exactly one clip to split");
        return;
      }

      const { trackId, clipId } = selectedClips[0];
      const track = tracks.find((t) => t.id === trackId);
      const clip = track?.clips.find((c) => c.id === clipId);

      if (!clip) return;

      const effectiveStart = clip.startTime;
      const effectiveEnd =
        clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);

      if (currentTime <= effectiveStart || currentTime >= effectiveEnd) {
        toast.error("Playhead must be within selected clip");
        return;
      }

      splitClip(trackId, clipId, currentTime);
      toast.success("Clip split at playhead");
    };

    const handleSplitAndKeepLeft = () => {
      if (selectedClips.length !== 1) {
        toast.error("Select exactly one clip");
        return;
      }

      const { trackId, clipId } = selectedClips[0];
      const track = tracks.find((t) => t.id === trackId);
      const clip = track?.clips.find((c) => c.id === clipId);

      if (!clip) return;

      const effectiveStart = clip.startTime;
      const effectiveEnd =
        clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);

      if (currentTime <= effectiveStart || currentTime >= effectiveEnd) {
        toast.error("Playhead must be within selected clip");
        return;
      }

      splitAndKeepLeft(trackId, clipId, currentTime);
      toast.success("Split and kept left portion");
    };

    const handleSplitAndKeepRight = () => {
      if (selectedClips.length !== 1) {
        toast.error("Select exactly one clip");
        return;
      }

      const { trackId, clipId } = selectedClips[0];
      const track = tracks.find((t) => t.id === trackId);
      const clip = track?.clips.find((c) => c.id === clipId);

      if (!clip) return;

      const effectiveStart = clip.startTime;
      const effectiveEnd =
        clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);

      if (currentTime <= effectiveStart || currentTime >= effectiveEnd) {
        toast.error("Playhead must be within selected clip");
        return;
      }

      splitAndKeepRight(trackId, clipId, currentTime);
      toast.success("Split and kept right portion");
    };

    const handleSeparateAudio = () => {
      if (selectedClips.length !== 1) {
        toast.error("Select exactly one video clip to separate audio");
        return;
      }

      const { trackId, clipId } = selectedClips[0];
      const track = tracks.find((t) => t.id === trackId);

      if (!track || track.type !== "video") {
        toast.error("Select a video clip to separate audio");
        return;
      }

      separateAudio(trackId, clipId);
      toast.success("Audio separated to audio track");
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [
    isPlaying,
    currentTime,
    selectedClips,
    tracks,
    play,
    pause,
    splitClip,
    splitAndKeepLeft,
    splitAndKeepRight,
    separateAudio,
  ]);
};

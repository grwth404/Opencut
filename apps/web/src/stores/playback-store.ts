import { create } from "zustand";
import type { PlaybackState, PlaybackControls } from "@/types/playback";

interface PlaybackStore extends PlaybackState, PlaybackControls {
  setDuration: (duration: number) => void;
  setCurrentTime: (time: number) => void;
}

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((state) => ({ isPlaying: !state.isPlaying })),
  seek: (time: number) => {
    const { duration } = get();
    const clampedTime = Math.max(0, Math.min(duration, time));
    set({ currentTime: clampedTime });
    
    // Notify video element to seek
    const event = new CustomEvent('playback-seek', { detail: { time: clampedTime } });
    window.dispatchEvent(event);
  },
  setVolume: (volume: number) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  setDuration: (duration: number) => set({ duration }),
  setCurrentTime: (time: number) => set({ currentTime: time }),
})); 
import { useEffect } from "react";
import { usePlaybackStore } from "@/stores/playback-store";

export function usePlaybackControls() {
  const { toggle } = usePlaybackStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);
} 
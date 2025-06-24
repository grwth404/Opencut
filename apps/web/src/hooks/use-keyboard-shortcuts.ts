import { useEffect } from "react";
import { useTimelineStore } from "@/stores/timeline-store";

export function useKeyboardShortcuts() {
  const { selectedClips, removeClipFromTrack, clearSelectedClips, undo, redo } =
    useTimelineStore();

  // Delete/Backspace - Delete selected clips
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedClips.length > 0
      ) {
        selectedClips.forEach(({ trackId, clipId }) => {
          removeClipFromTrack(trackId, clipId);
        });
        clearSelectedClips();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedClips, removeClipFromTrack, clearSelectedClips]);

  // Cmd+Z / Ctrl+Z - Undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo]);

  // Cmd+Shift+Z / Ctrl+Shift+Z or Cmd+Y / Ctrl+Y - Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [redo]);
}

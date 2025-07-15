import { useEffect } from "react";

export const useDisableBrowserZoom = () => {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        const key = e.key;
        if (key === "+" || key === "-" || key === "0" || key === "=") {
          e.preventDefault();
        }
      }
    };

    const handleGesture = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown, { passive: false });

    window.addEventListener("gesturestart", handleGesture, {
      passive: false,
    });
    window.addEventListener("gesturechange", handleGesture, {
      passive: false,
    });
    window.addEventListener("gestureend", handleGesture, {
      passive: false,
    });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("gesturestart", handleGesture);
      window.removeEventListener("gesturechange", handleGesture);
      window.removeEventListener("gestureend", handleGesture);
    };
  }, []);
};

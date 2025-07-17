import { useEffect, useRef } from "react";

export interface TimelineScrollSyncProps {
	rulerScrollRef: React.RefObject<HTMLDivElement>;
	tracksScrollRef: React.RefObject<HTMLDivElement>;
}

export function useTimelineScrollSync({
	rulerScrollRef,
	tracksScrollRef,
}: TimelineScrollSyncProps) {
	const isUpdatingRef = useRef(false);
	const lastSyncRef = useRef(0);

	// --- Horizontal scroll synchronization between ruler and tracks ---
	useEffect(() => {
		const rulerViewport = rulerScrollRef.current?.querySelector(
			"[data-radix-scroll-area-viewport]",
		) as HTMLElement;
		const tracksViewport = tracksScrollRef.current?.querySelector(
			"[data-radix-scroll-area-viewport]",
		) as HTMLElement;

		if (!rulerViewport || !tracksViewport) return;

		// Throttled scroll handlers for better performance
		const handleRulerScroll = () => {
			const now = Date.now();
			if (isUpdatingRef.current || now - lastSyncRef.current < 16) return; // 60fps throttling
			lastSyncRef.current = now;

			isUpdatingRef.current = true;
			tracksViewport.scrollLeft = rulerViewport.scrollLeft;
			isUpdatingRef.current = false;
		};

		const handleTracksScroll = () => {
			const now = Date.now();
			if (isUpdatingRef.current || now - lastSyncRef.current < 16) return; // 60fps throttling
			lastSyncRef.current = now;

			isUpdatingRef.current = true;
			rulerViewport.scrollLeft = tracksViewport.scrollLeft;
			isUpdatingRef.current = false;
		};

		rulerViewport.addEventListener("scroll", handleRulerScroll, {
			passive: true,
		});
		tracksViewport.addEventListener("scroll", handleTracksScroll, {
			passive: true,
		});

		return () => {
			rulerViewport.removeEventListener("scroll", handleRulerScroll);
			tracksViewport.removeEventListener("scroll", handleTracksScroll);
		};
	}, [rulerScrollRef, tracksScrollRef]);

	return null;
}

import { useMemo } from "react";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { useTimelinePlayheadRuler } from "./timeline-playhead";

export interface TimelineRulerProps {
	duration: number;
	zoomLevel: number;
	currentTime: number;
	seek: (time: number) => void;
	rulerRef: React.RefObject<HTMLDivElement>;
	rulerScrollRef: React.RefObject<HTMLDivElement>;
	tracksScrollRef: React.RefObject<HTMLDivElement>;
	playheadRef: React.RefObject<HTMLDivElement>;
	handleSelectionMouseDown: (e: React.MouseEvent) => void;
	handleTimelineContentClick: (e: React.MouseEvent) => void;
}

export function TimelineRuler({
	duration,
	zoomLevel,
	currentTime,
	seek,
	rulerRef,
	rulerScrollRef,
	tracksScrollRef,
	playheadRef,
	handleSelectionMouseDown,
	handleTimelineContentClick,
}: TimelineRulerProps) {
	// Timeline playhead ruler handlers
	const { handleRulerMouseDown } = useTimelinePlayheadRuler({
		currentTime,
		duration,
		zoomLevel,
		seek,
		rulerRef,
		rulerScrollRef,
		tracksScrollRef,
		playheadRef,
	});

	// Memoize the expensive ruler markers calculation
	const rulerMarkers = useMemo(() => {
		// Calculate appropriate time interval based on zoom level
		const getTimeInterval = (zoom: number) => {
			const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoom;
			if (pixelsPerSecond >= 200) return 0.1; // Every 0.1s when very zoomed in
			if (pixelsPerSecond >= 100) return 0.5; // Every 0.5s when zoomed in
			if (pixelsPerSecond >= 50) return 1; // Every 1s at normal zoom
			if (pixelsPerSecond >= 25) return 2; // Every 2s when zoomed out
			if (pixelsPerSecond >= 12) return 5; // Every 5s when more zoomed out
			if (pixelsPerSecond >= 6) return 10; // Every 10s when very zoomed out
			return 30; // Every 30s when extremely zoomed out
		};

		const formatTime = (seconds: number, interval: number) => {
			const hours = Math.floor(seconds / 3600);
			const minutes = Math.floor((seconds % 3600) / 60);
			const secs = seconds % 60;

			if (hours > 0) {
				return `${hours}:${minutes.toString().padStart(2, "0")}:${Math.floor(secs).toString().padStart(2, "0")}`;
			} else if (minutes > 0) {
				return `${minutes}:${Math.floor(secs).toString().padStart(2, "0")}`;
			} else if (interval >= 1) {
				return `${Math.floor(secs)}s`;
			} else {
				return `${secs.toFixed(1)}s`;
			}
		};

		const interval = getTimeInterval(zoomLevel);
		const markerCount = Math.ceil(duration / interval) + 1;
		const markers = [];

		for (let i = 0; i < markerCount; i++) {
			const time = i * interval;
			if (time > duration) break;

			const isMainMarker =
				time % (interval >= 1 ? Math.max(1, interval) : 1) === 0;
			const leftPosition =
				time * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;

			markers.push(
				<div
					key={i}
					className={`absolute top-0 bottom-0 z-[99] ${
						isMainMarker
							? "border-l border-muted-foreground/40"
							: "border-l border-muted-foreground/20"
					}`}
					style={{ left: `${leftPosition}px` }}
				>
					<span
						className={`absolute top-1 left-1 text-[0.6rem] z-[99] ${
							isMainMarker
								? "text-muted-foreground font-medium"
								: "text-muted-foreground/70"
						}`}
					>
						{formatTime(time, interval)}
					</span>
				</div>,
			);
		}

		return markers;
	}, [duration, zoomLevel]); // Only recalculate when duration or zoomLevel changes

	return (
		<div
			className="sticky top-0 bg-card/[0.99] border-b border-muted/30 z-[99]"
			onMouseDown={handleSelectionMouseDown}
			onClick={handleTimelineContentClick}
			data-ruler-area
		>
			<div
				ref={rulerRef}
				className="relative h-5 select-none cursor-default pb-1 z-[99]"
				onMouseDown={handleRulerMouseDown}
			>
				{rulerMarkers}
			</div>
		</div>
	);
}

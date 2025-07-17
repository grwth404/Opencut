"use client";

import { useRef } from "react";
import { TimelineTrack } from "@/types/timeline";
import {
	TIMELINE_CONSTANTS,
	getTotalTracksHeight,
} from "@/constants/timeline-constants";
import { useTimelinePlayhead } from "@/hooks/use-timeline-playhead";

interface TimelinePlayheadProps {
	currentTime: number;
	duration: number;
	zoomLevel: number;
	tracks: TimelineTrack[];
	seek: (time: number) => void;
	rulerRef: React.RefObject<HTMLDivElement>;
	rulerScrollRef: React.RefObject<HTMLDivElement>;
	tracksScrollRef: React.RefObject<HTMLDivElement>;
	trackLabelsRef?: React.RefObject<HTMLDivElement>;
	timelineRef: React.RefObject<HTMLDivElement>;
	playheadRef?: React.RefObject<HTMLDivElement>;
	isSnappingToPlayhead?: boolean;
}

export function TimelinePlayhead({
	currentTime,
	duration,
	zoomLevel,
	tracks,
	seek,
	rulerRef,
	rulerScrollRef,
	tracksScrollRef,
	trackLabelsRef,
	timelineRef,
	playheadRef: externalPlayheadRef,
	isSnappingToPlayhead = false,
}: TimelinePlayheadProps) {
	const internalPlayheadRef = useRef<HTMLDivElement>(null);
	const playheadRef = externalPlayheadRef || internalPlayheadRef;
	const { playheadPosition, handlePlayheadMouseDown } = useTimelinePlayhead({
		currentTime,
		duration,
		zoomLevel,
		seek,
		rulerRef,
		rulerScrollRef,
		tracksScrollRef,
		playheadRef,
	});

	// Use timeline container height minus a few pixels for breathing room
	const timelineContainerHeight = timelineRef.current?.offsetHeight || 400;
	const totalHeight = timelineContainerHeight - 8; // 8px padding from edges

	// Get dynamic track labels width, fallback to 192px (ml-48) if no tracks or no ref
	const trackLabelsWidth = 192; // Fixed width from grid layout
	const leftPosition =
		playheadPosition * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;

	return (
		<>
			{/* Playhead line container */}
			<div
				ref={playheadRef}
				className="absolute pointer-events-auto z-[95]"
				style={{
					left: `${trackLabelsWidth + leftPosition}px`,
					top: 0,
					bottom: 0,
					width: "2px", // Slightly wider for better click target
				}}
				onMouseDown={handlePlayheadMouseDown}
			>
				{/* The playhead line spanning full height */}
				<div
					className={`absolute left-0 w-0.5 cursor-col-resize h-full ${isSnappingToPlayhead ? "bg-primary" : "bg-foreground"}`}
				/>
			</div>

			{/* Playhead dot indicator - separate container with highest z-index */}
			<div
				className="absolute pointer-events-none z-[100]"
				style={{
					left: `${trackLabelsWidth + leftPosition}px`,
					top: 0,
					bottom: 0,
				}}
			>
				<div
					className={`sticky top-1 left-1 -translate-x-[40%] transform w-3 h-3 rounded-full shadow-sm ${isSnappingToPlayhead ? "bg-primary border-primary" : "bg-foreground border-foreground"}`}
				/>
			</div>
		</>
	);
}

// Also export a hook for getting ruler handlers
export function useTimelinePlayheadRuler({
	currentTime,
	duration,
	zoomLevel,
	seek,
	rulerRef,
	rulerScrollRef,
	tracksScrollRef,
	playheadRef,
}: Omit<TimelinePlayheadProps, "tracks" | "trackLabelsRef" | "timelineRef">) {
	const { handleRulerMouseDown, isDraggingRuler } = useTimelinePlayhead({
		currentTime,
		duration,
		zoomLevel,
		seek,
		rulerRef,
		rulerScrollRef,
		tracksScrollRef,
		playheadRef,
	});

	return { handleRulerMouseDown, isDraggingRuler };
}

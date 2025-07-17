import { useCallback } from "react";
import { useProjectStore } from "@/stores/project-store";
import {
	TIMELINE_CONSTANTS,
	snapTimeToFrame,
} from "@/constants/timeline-constants";

export interface TimelineContentClickProps {
	duration: number;
	zoomLevel: number;
	seek: (time: number) => void;
	rulerScrollRef: React.RefObject<HTMLDivElement>;
	tracksScrollRef: React.RefObject<HTMLDivElement>;
	clearSelectedElements: () => void;
	isSelecting: boolean;
	justFinishedSelecting: boolean;
	playheadRef: React.RefObject<HTMLDivElement>;
}

export function useTimelineContentClick({
	duration,
	zoomLevel,
	seek,
	rulerScrollRef,
	tracksScrollRef,
	clearSelectedElements,
	isSelecting,
	justFinishedSelecting,
	playheadRef,
}: TimelineContentClickProps) {
	const { activeProject } = useProjectStore();

	// Timeline content click to seek handler
	const handleTimelineContentClick = useCallback(
		(e: React.MouseEvent) => {
			// Don't seek if this was a selection box operation
			if (isSelecting || justFinishedSelecting) {
				return;
			}

			// Don't seek if clicking on timeline elements, but still deselect
			if ((e.target as HTMLElement).closest(".timeline-element")) {
				return;
			}

			// Don't seek if clicking on playhead
			if (playheadRef.current?.contains(e.target as Node)) {
				return;
			}

			// Don't seek if clicking on track labels
			if ((e.target as HTMLElement).closest("[data-track-labels]")) {
				clearSelectedElements();
				return;
			}

			// Clear selected elements when clicking empty timeline area
			clearSelectedElements();

			// Determine if we're clicking in ruler or tracks area
			const isRulerClick = (e.target as HTMLElement).closest(
				"[data-ruler-area]",
			);

			let mouseX: number;
			let scrollLeft = 0;

			if (isRulerClick) {
				// Calculate based on ruler position
				const rulerContent = rulerScrollRef.current?.querySelector(
					"[data-radix-scroll-area-viewport]",
				) as HTMLElement;
				if (!rulerContent) return;
				const rect = rulerContent.getBoundingClientRect();
				mouseX = e.clientX - rect.left;
				scrollLeft = rulerContent.scrollLeft;
			} else {
				// Calculate based on tracks content position
				const tracksContent = tracksScrollRef.current?.querySelector(
					"[data-radix-scroll-area-viewport]",
				) as HTMLElement;
				if (!tracksContent) return;
				const rect = tracksContent.getBoundingClientRect();
				mouseX = e.clientX - rect.left;
				scrollLeft = tracksContent.scrollLeft;
			}

			const rawTime = Math.max(
				0,
				Math.min(
					duration,
					(mouseX + scrollLeft) /
						(TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel),
				),
			);

			// Use frame snapping for timeline clicking
			const projectFps = activeProject?.fps || 30;
			const time = snapTimeToFrame(rawTime, projectFps);

			seek(time);
		},
		[
			duration,
			zoomLevel,
			seek,
			rulerScrollRef,
			tracksScrollRef,
			clearSelectedElements,
			isSelecting,
			justFinishedSelecting,
			playheadRef,
			activeProject?.fps,
		],
	);

	return { handleTimelineContentClick };
}

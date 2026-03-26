import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { getCumulativeHeightBefore, getTrackHeight } from "@/lib/timeline";
import type { TimelineTrack } from "@/lib/timeline";

type TimelineElementRef = { trackId: string; elementId: string };

interface SelectionRectangle {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

function getNormalizedRectangle({
	startPos,
	endPos,
}: {
	startPos: { x: number; y: number };
	endPos: { x: number; y: number };
}): SelectionRectangle {
	return {
		left: Math.min(startPos.x, endPos.x),
		top: Math.min(startPos.y, endPos.y),
		right: Math.max(startPos.x, endPos.x),
		bottom: Math.max(startPos.y, endPos.y),
	};
}

function getSelectionRectangleInContent({
	container,
	scrollContainer,
	startPos,
	endPos,
}: {
	container: HTMLElement;
	scrollContainer: HTMLDivElement | null;
	startPos: { x: number; y: number };
	endPos: { x: number; y: number };
}): SelectionRectangle {
	const containerRect = container.getBoundingClientRect();
	const scrollRect = scrollContainer?.getBoundingClientRect() ?? containerRect;
	const scrollLeft = scrollContainer?.scrollLeft ?? 0;
	const scrollTop = scrollContainer?.scrollTop ?? 0;

	const adjustedStart = {
		x: startPos.x - containerRect.left + scrollLeft,
		y: startPos.y - scrollRect.top + scrollTop,
	};
	const adjustedEnd = {
		x: endPos.x - containerRect.left + scrollLeft,
		y: endPos.y - scrollRect.top + scrollTop,
	};

	return getNormalizedRectangle({
		startPos: adjustedStart,
		endPos: adjustedEnd,
	});
}

function isRectangleIntersecting({
	elementRectangle,
	selectionRectangle,
}: {
	elementRectangle: SelectionRectangle;
	selectionRectangle: SelectionRectangle;
}): boolean {
	return !(
		elementRectangle.right < selectionRectangle.left ||
		elementRectangle.left > selectionRectangle.right ||
		elementRectangle.bottom < selectionRectangle.top ||
		elementRectangle.top > selectionRectangle.bottom
	);
}

export function resolveTimelineElementIntersections({
	container,
	scrollContainer,
	tracks,
	zoomLevel,
	startPos,
	currentPos,
}: {
	container: HTMLElement;
	scrollContainer: HTMLDivElement | null;
	tracks: TimelineTrack[];
	zoomLevel: number;
	startPos: { x: number; y: number };
	currentPos: { x: number; y: number };
}): TimelineElementRef[] {
	const selectionRectangle = getSelectionRectangleInContent({
		container,
		scrollContainer,
		startPos,
		endPos: currentPos,
	});
	const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
	const selectedElements: TimelineElementRef[] = [];

	for (const [trackIndex, track] of tracks.entries()) {
		const trackTop = getCumulativeHeightBefore({
			tracks,
			trackIndex,
		});
		const trackHeight = getTrackHeight({ type: track.type });
		const elementTop = TIMELINE_CONSTANTS.PADDING_TOP_PX + trackTop;
		const elementBottom = elementTop + trackHeight;

		for (const element of track.elements) {
			const elementLeft = element.startTime * pixelsPerSecond;
			const elementRight = elementLeft + element.duration * pixelsPerSecond;
			const elementRectangle = {
				left: elementLeft,
				top: elementTop,
				right: elementRight,
				bottom: elementBottom,
			};

			if (
				isRectangleIntersecting({
					elementRectangle,
					selectionRectangle,
				})
			) {
				selectedElements.push({
					trackId: track.id,
					elementId: element.id,
				});
			}
		}
	}

	return selectedElements;
}

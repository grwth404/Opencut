import type {
	TimelineTrack,
	TimelineElement,
} from "@/lib/timeline";
import { TRACK_CONFIG, TRACK_GAP } from "@/constants/timeline-constants";
import type { ComputeDropTargetParams, DropTarget } from "@/lib/timeline";
import { resolveTrackPlacement } from "@/lib/track-placement";

function findElementAtPosition({
	mouseX,
	tracks,
	trackIndex,
	targetElementTypes,
	pixelsPerSecond,
	zoomLevel,
}: {
	mouseX: number;
	tracks: TimelineTrack[];
	trackIndex: number;
	targetElementTypes: string[];
	pixelsPerSecond: number;
	zoomLevel: number;
}): { elementId: string; trackId: string } | null {
	const time = mouseX / (pixelsPerSecond * zoomLevel);
	const track = tracks[trackIndex];
	if (!track || !("elements" in track)) return null;

	const hit = track.elements.find(
		(element: TimelineElement) =>
			targetElementTypes.includes(element.type) &&
			element.startTime <= time &&
			time < element.startTime + element.duration,
	);
	if (!hit) return null;
	return { elementId: hit.id, trackId: track.id };
}

function getTrackAtY({
	mouseY,
	tracks,
	verticalDragDirection,
}: {
	mouseY: number;
	tracks: TimelineTrack[];
	verticalDragDirection?: "up" | "down" | null;
}): { trackIndex: number; relativeY: number } | null {
	let cumulativeHeight = 0;

	for (let i = 0; i < tracks.length; i++) {
		const trackHeight = TRACK_CONFIG[tracks[i].type].height;
		const trackTop = cumulativeHeight;
		const trackBottom = trackTop + trackHeight;

		if (mouseY >= trackTop && mouseY < trackBottom) {
			return {
				trackIndex: i,
				relativeY: mouseY - trackTop,
			};
		}

		if (i < tracks.length - 1 && verticalDragDirection) {
			const gapTop = trackBottom;
			const gapBottom = gapTop + TRACK_GAP;
			if (mouseY >= gapTop && mouseY < gapBottom) {
				const isDraggingUp = verticalDragDirection === "up";
				return {
					trackIndex: isDraggingUp ? i : i + 1,
					relativeY: isDraggingUp ? trackHeight - 1 : 0,
				};
			}
		}

		cumulativeHeight += trackHeight + TRACK_GAP;
	}

	return null;
}

const EMPTY_TARGET_ELEMENT = null;

function fallbackNewTrackDropTarget({
	xPosition,
}: {
	xPosition: number;
}): DropTarget {
	return {
		trackIndex: 0,
		isNewTrack: true,
		insertPosition: null,
		xPosition,
		targetElement: EMPTY_TARGET_ELEMENT,
	};
}

export function computeDropTarget({
	elementType,
	mouseX,
	mouseY,
	tracks,
	playheadTime,
	isExternalDrop,
	elementDuration,
	pixelsPerSecond,
	zoomLevel,
	verticalDragDirection,
	startTimeOverride,
	excludeElementId,
	targetElementTypes,
}: ComputeDropTargetParams): DropTarget {
	const xPosition =
		typeof startTimeOverride === "number"
			? startTimeOverride
			: isExternalDrop
				? playheadTime
				: Math.max(0, mouseX / (pixelsPerSecond * zoomLevel));

	if (tracks.length === 0) {
		const placementResult = resolveTrackPlacement({
			tracks,
			elementType,
			timeSpans: [{ startTime: xPosition, duration: elementDuration, excludeElementId }],
			strategy: {
				type: "preferIndex",
				trackIndex: 0,
				hoverDirection: "below",
				createNewTrackOnly: true,
			},
		});
		const emptyTimelineResult =
			placementResult?.kind === "newTrack" ? placementResult : null;
		if (!emptyTimelineResult) {
			return fallbackNewTrackDropTarget({ xPosition });
		}

		return {
			trackIndex: emptyTimelineResult.insertIndex,
			isNewTrack: true,
			insertPosition: emptyTimelineResult.insertPosition,
			xPosition,
			targetElement: EMPTY_TARGET_ELEMENT,
		};
	}

	const trackAtMouse = getTrackAtY({ mouseY, tracks, verticalDragDirection });

	if (!trackAtMouse) {
		const isAboveAllTracks = mouseY < 0;

		const placementResult = resolveTrackPlacement({
			tracks,
			elementType,
			timeSpans: [{ startTime: xPosition, duration: elementDuration, excludeElementId }],
			strategy: {
				type: "preferIndex",
				trackIndex: isAboveAllTracks ? 0 : tracks.length - 1,
				hoverDirection: isAboveAllTracks ? "above" : "below",
				createNewTrackOnly: true,
			},
		});
		const outOfBoundsResult =
			placementResult?.kind === "newTrack" ? placementResult : null;
		if (!outOfBoundsResult) {
			return fallbackNewTrackDropTarget({ xPosition });
		}

		return {
			trackIndex: outOfBoundsResult.insertIndex,
			isNewTrack: true,
			insertPosition: outOfBoundsResult.insertPosition,
			xPosition,
			targetElement: EMPTY_TARGET_ELEMENT,
		};
	}

	const { trackIndex, relativeY } = trackAtMouse;
	const track = tracks[trackIndex];

	if (
		targetElementTypes &&
		targetElementTypes.length > 0
	) {
		const targetElement = findElementAtPosition({
			mouseX,
			tracks,
			trackIndex,
			targetElementTypes,
			pixelsPerSecond,
			zoomLevel,
		});
		if (targetElement) {
			return {
				trackIndex,
				isNewTrack: false,
				insertPosition: null,
				xPosition,
				targetElement,
			};
		}
	}

	const trackHeight = TRACK_CONFIG[track.type].height;
	const placementResult = resolveTrackPlacement({
		tracks,
		elementType,
		timeSpans: [{ startTime: xPosition, duration: elementDuration, excludeElementId }],
		strategy: {
			type: "preferIndex",
			trackIndex,
			hoverDirection: relativeY < trackHeight / 2 ? "above" : "below",
			verticalDragDirection,
		},
	});
	if (!placementResult) {
		return fallbackNewTrackDropTarget({ xPosition });
	}

	if (placementResult.kind === "existingTrack") {
		const adjustedXPosition =
			placementResult.adjustedStartTime ?? xPosition;

		return {
			trackIndex: placementResult.trackIndex,
			isNewTrack: false,
			insertPosition: null,
			xPosition: adjustedXPosition,
			targetElement: EMPTY_TARGET_ELEMENT,
		};
	}

	return {
		trackIndex: placementResult.insertIndex,
		isNewTrack: true,
		insertPosition: placementResult.insertPosition,
		xPosition,
		targetElement: EMPTY_TARGET_ELEMENT,
	};
}

export function getDropLineY({
	dropTarget,
	tracks,
}: {
	dropTarget: DropTarget;
	tracks: TimelineTrack[];
}): number {
	const safeTrackIndex = Math.min(
		Math.max(dropTarget.trackIndex, 0),
		tracks.length,
	);
	let y = 0;

	for (let i = 0; i < safeTrackIndex; i++) {
		y += TRACK_CONFIG[tracks[i].type].height + TRACK_GAP;
	}

	return y;
}

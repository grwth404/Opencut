import type { SceneTracks, TimelineElement, VideoTrack } from "@/lib/timeline";

export const MAIN_TRACK_NAME = "Main Track";

export function getEarliestMainTrackElement({
	mainTrack,
	excludeElementId,
}: {
	mainTrack: VideoTrack;
	excludeElementId?: string;
}): TimelineElement | null {
	const elements = mainTrack.elements.filter((element) => {
		return !excludeElementId || element.id !== excludeElementId;
	});
	if (elements.length === 0) {
		return null;
	}

	return elements.reduce((earliestElement, element) => {
		return element.startTime < earliestElement.startTime
			? element
			: earliestElement;
	});
}

export function enforceMainTrackStart({
	tracks,
	targetTrackId,
	requestedStartTime,
	excludeElementId,
}: {
	tracks: SceneTracks;
	targetTrackId: string;
	requestedStartTime: number;
	excludeElementId?: string;
}): number {
	if (tracks.main.id !== targetTrackId) {
		return requestedStartTime;
	}

	const earliestElement = getEarliestMainTrackElement({
		mainTrack: tracks.main,
		excludeElementId,
	});
	if (!earliestElement) {
		return 0;
	}

	if (requestedStartTime <= earliestElement.startTime) {
		return 0;
	}

	return requestedStartTime;
}

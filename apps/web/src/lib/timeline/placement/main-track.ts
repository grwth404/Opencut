import type { TimelineElement, TimelineTrack, VideoTrack } from "@/lib/timeline";
import { generateUUID } from "@/utils/id";

const MAIN_TRACK_NAME = "Main Track";

export function isMainTrack(track: TimelineTrack): track is VideoTrack {
	return track.type === "video" && track.isMain === true;
}

export function getMainTrack({
	tracks,
}: {
	tracks: TimelineTrack[];
}): VideoTrack | null {
	return tracks.find((track) => isMainTrack(track)) ?? null;
}

export function ensureMainTrack({
	tracks,
}: {
	tracks: TimelineTrack[];
}): TimelineTrack[] {
	if (tracks.some((track) => isMainTrack(track))) {
		return tracks;
	}

	return [
		{
			id: generateUUID(),
			name: MAIN_TRACK_NAME,
			type: "video",
			elements: [],
			muted: false,
			isMain: true,
			hidden: false,
		},
		...tracks,
	];
}

export function getEarliestMainTrackElement({
	tracks,
	excludeElementId,
}: {
	tracks: TimelineTrack[];
	excludeElementId?: string;
}): TimelineElement | null {
	const mainTrack = getMainTrack({ tracks });
	if (!mainTrack) {
		return null;
	}

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
	tracks: TimelineTrack[];
	targetTrackId: string;
	requestedStartTime: number;
	excludeElementId?: string;
}): number {
	const mainTrack = getMainTrack({ tracks });
	if (!mainTrack || mainTrack.id !== targetTrackId) {
		return requestedStartTime;
	}

	const earliestElement = getEarliestMainTrackElement({
		tracks,
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

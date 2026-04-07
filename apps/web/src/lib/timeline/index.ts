import type { SceneTracks } from "./types";

export * from "./types";
export * from "./drag";
export * from "./track-capabilities";
export * from "./track-element-update";
export * from "./element-utils";
export * from "./audio-separation";
export * from "./zoom-utils";
export * from "./ruler-utils";
export * from "./pixel-utils";

export function calculateTotalDuration({
	tracks,
}: {
	tracks: SceneTracks;
}): number {
	const orderedTracks = [...tracks.overlay, tracks.main, ...tracks.audio];
	if (orderedTracks.length === 0) return 0;

	const trackEndTimes = orderedTracks.map((track) =>
		track.elements.reduce((maxEnd, element) => {
			const elementEnd = element.startTime + element.duration;
			return Math.max(maxEnd, elementEnd);
		}, 0),
	);

	return Math.max(...trackEndTimes, 0);
}

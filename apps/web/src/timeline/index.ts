import { type MediaTime, ZERO_MEDIA_TIME } from "@/wasm";
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
}): MediaTime {
	const orderedTracks = [...tracks.overlay, tracks.main, ...tracks.audio];
	if (orderedTracks.length === 0) return ZERO_MEDIA_TIME;

	let maxEnd: MediaTime = ZERO_MEDIA_TIME;
	for (const track of orderedTracks) {
		for (const element of track.elements) {
			// `startTime + duration` is integer-by-construction (both `MediaTime`),
			// so the cast re-establishes the brand without runtime work.
			const elementEnd = (element.startTime + element.duration) as MediaTime;
			if (elementEnd > maxEnd) maxEnd = elementEnd;
		}
	}
	return maxEnd;
}

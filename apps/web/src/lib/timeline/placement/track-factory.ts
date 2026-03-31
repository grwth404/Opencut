import { TRACK_CONFIG } from "@/constants/timeline-constants";
import type { TrackType, TimelineTrack } from "@/lib/timeline";

export function buildEmptyTrack({
	id,
	type,
	name,
}: {
	id: string;
	type: TrackType;
	name?: string;
}): TimelineTrack {
	const trackName = name ?? TRACK_CONFIG[type].defaultName;

	switch (type) {
		case "video":
			return {
				id,
				name: trackName,
				type: "video",
				elements: [],
				hidden: false,
				muted: false,
				isMain: false,
			};
		case "text":
			return {
				id,
				name: trackName,
				type: "text",
				elements: [],
				hidden: false,
			};
		case "graphic":
			return {
				id,
				name: trackName,
				type: "graphic",
				elements: [],
				hidden: false,
			};
		case "audio":
			return {
				id,
				name: trackName,
				type: "audio",
				elements: [],
				muted: false,
			};
		case "effect":
			return {
				id,
				name: trackName,
				type: "effect",
				elements: [],
				hidden: false,
			};
		default:
			throw new Error(`Unsupported track type: ${type}`);
	}
}

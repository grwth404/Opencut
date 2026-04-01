import type { TrackType } from "@/lib/timeline";
import {
	TIMELINE_TRACK_GAP_PX,
	TIMELINE_TRACK_HEIGHTS_PX,
} from "./layout";

export function getTrackHeight({ type }: { type: TrackType }): number {
	return TIMELINE_TRACK_HEIGHTS_PX[type];
}

export function getCumulativeHeightBefore({
	tracks,
	trackIndex,
}: {
	tracks: Array<{ type: TrackType }>;
	trackIndex: number;
}): number {
	return tracks
		.slice(0, trackIndex)
		.reduce(
			(sum, track) => sum + getTrackHeight({ type: track.type }) + TIMELINE_TRACK_GAP_PX,
			0,
		);
}

export function getTotalTracksHeight({
	tracks,
}: {
	tracks: Array<{ type: TrackType }>;
}): number {
	const tracksHeight = tracks.reduce(
		(sum, track) => sum + getTrackHeight({ type: track.type }),
		0,
	);
	const gapsHeight = Math.max(0, tracks.length - 1) * TIMELINE_TRACK_GAP_PX;
	return tracksHeight + gapsHeight;
}

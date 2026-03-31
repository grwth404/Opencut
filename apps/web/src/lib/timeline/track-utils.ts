import type {
	TrackType,
	TimelineTrack,
	VideoTrack,
	AudioTrack,
	GraphicTrack,
	TextTrack,
	EffectTrack,
} from "@/lib/timeline";
import {
	TRACK_CONFIG,
	ELEMENT_TYPE_CONFIG,
	TRACK_GAP,
} from "@/constants/timeline-constants";

export function canTracktHaveAudio(
	track: TimelineTrack,
): track is VideoTrack | AudioTrack {
	return track.type === "audio" || track.type === "video";
}

export function canTrackBeHidden(
	track: TimelineTrack,
): track is VideoTrack | TextTrack | GraphicTrack | EffectTrack {
	return track.type !== "audio";
}

export function getElementClasses({ type }: { type: TrackType }) {
	return ELEMENT_TYPE_CONFIG[type].background.trim();
}

export function getTrackHeight({ type }: { type: TrackType }): number {
	return TRACK_CONFIG[type].height;
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
			(sum, track) => sum + getTrackHeight({ type: track.type }) + TRACK_GAP,
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
	const gapsHeight = Math.max(0, tracks.length - 1) * TRACK_GAP;
	return tracksHeight + gapsHeight;
}

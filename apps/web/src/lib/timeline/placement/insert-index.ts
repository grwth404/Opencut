import type { TrackType, TimelineTrack } from "@/lib/timeline";
import { isMainTrack } from "./main-track";

export function getDefaultInsertIndexForTrack({
	tracks,
	trackType,
}: {
	tracks: TimelineTrack[];
	trackType: TrackType;
}): number {
	if (trackType === "audio") {
		return tracks.length;
	}

	if (trackType === "effect") {
		return 0;
	}

	const mainTrackIndex = tracks.findIndex((track) => isMainTrack(track));
	if (mainTrackIndex >= 0) {
		return mainTrackIndex;
	}

	const firstAudioTrackIndex = tracks.findIndex((track) => track.type === "audio");
	if (firstAudioTrackIndex >= 0) {
		return firstAudioTrackIndex;
	}

	return tracks.length;
}

export function getHighestInsertIndexForTrack({
	tracks,
	trackType,
}: {
	tracks: TimelineTrack[];
	trackType: TrackType;
}): number {
	const mainTrackIndex = tracks.findIndex((track) => isMainTrack(track));
	if (trackType === "audio") {
		return mainTrackIndex >= 0 ? mainTrackIndex + 1 : tracks.length;
	}

	return 0;
}

export function resolvePreferredNewTrackPlacement({
	tracks,
	trackType,
	preferredIndex,
	direction,
}: {
	tracks: TimelineTrack[];
	trackType: TrackType;
	preferredIndex: number;
	direction: "above" | "below";
}): { insertIndex: number; insertPosition: "above" | "below" | null } {
	if (tracks.length === 0) {
		return {
			insertIndex: 0,
			insertPosition: trackType === "audio" ? "below" : null,
		};
	}

	const safePreferredIndex = Math.min(
		Math.max(preferredIndex, 0),
		tracks.length - 1,
	);
	const mainTrackIndex = tracks.findIndex((track) => isMainTrack(track));

	if (trackType === "audio") {
		if (safePreferredIndex <= mainTrackIndex) {
			return {
				insertIndex: mainTrackIndex + 1,
				insertPosition: "below",
			};
		}

		return {
			insertIndex:
				direction === "above" ? safePreferredIndex : safePreferredIndex + 1,
			insertPosition: direction,
		};
	}

	const insertIndex =
		direction === "above" ? safePreferredIndex : safePreferredIndex + 1;
	if (mainTrackIndex >= 0 && insertIndex > mainTrackIndex) {
		return {
			insertIndex: mainTrackIndex,
			insertPosition: "above",
		};
	}

	return {
		insertIndex,
		insertPosition: direction,
	};
}

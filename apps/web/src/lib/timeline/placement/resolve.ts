import type { TrackType, TimelineTrack } from "@/lib/timeline";
import {
	getDefaultInsertIndexForTrack,
	getHighestInsertIndexForTrack,
	resolvePreferredNewTrackPlacement,
} from "./insert-index";
import { getTrackTypeForElementType } from "./compatibility";
import { enforceMainTrackStart } from "./main-track";
import { canPlaceTimeSpansOnTrack } from "./overlap";
import type {
	PlacementResult,
	PlacementStrategy,
	PlacementSubject,
	PlacementTimeSpan,
} from "./types";

type ResolveTrackPlacementParams = PlacementSubject & {
	tracks: TimelineTrack[];
	timeSpans: PlacementTimeSpan[];
	strategy: PlacementStrategy;
};

function buildExistingTrackResult({
	track,
	trackIndex,
	tracks,
	timeSpans,
}: {
	track: TimelineTrack;
	trackIndex: number;
	tracks: TimelineTrack[];
	timeSpans: PlacementTimeSpan[];
}): PlacementResult {
	const firstSpan = timeSpans[0];
	const requestedStartTime = firstSpan?.startTime ?? 0;
	const adjustedStartTime = enforceMainTrackStart({
		tracks,
		targetTrackId: track.id,
		requestedStartTime,
		excludeElementId: firstSpan?.excludeElementId,
	});
	return {
		kind: "existingTrack",
		trackId: track.id,
		trackIndex,
		trackType: track.type,
		...(adjustedStartTime !== requestedStartTime ? { adjustedStartTime } : {}),
	};
}

function buildNewTrackResult({
	trackType,
	insertIndex,
	insertPosition,
}: {
	trackType: TrackType;
	insertIndex: number;
	insertPosition: "above" | "below" | null;
}): PlacementResult {
	return {
		kind: "newTrack",
		trackType,
		insertIndex,
		insertPosition,
	};
}

function findFirstAvailableTrackIndex({
	tracks,
	trackType,
	timeSpans,
}: {
	tracks: TimelineTrack[];
	trackType: TrackType;
	timeSpans: PlacementTimeSpan[];
}): number {
	return tracks.findIndex((track) => {
		return (
			track.type === trackType &&
			canPlaceTimeSpansOnTrack({
				track,
				timeSpans,
			})
		);
	});
}

function resolveAlwaysNewTrack({
	tracks,
	trackType,
	position,
}: {
	tracks: TimelineTrack[];
	trackType: TrackType;
	position: "highest" | "default";
}): PlacementResult {
	const insertIndex =
		position === "highest"
			? getHighestInsertIndexForTrack({
					tracks,
					trackType,
				})
			: getDefaultInsertIndexForTrack({
					tracks,
					trackType,
				});

	return buildNewTrackResult({
		trackType,
		insertIndex,
		insertPosition: null,
	});
}

function getInsertDirection({
	hoverDirection,
	verticalDragDirection,
}: {
	hoverDirection: "above" | "below";
	verticalDragDirection?: "up" | "down" | null;
}): "above" | "below" {
	if (verticalDragDirection === "up") {
		return "above";
	}

	if (verticalDragDirection === "down") {
		return "below";
	}

	return hoverDirection;
}

export function resolveTrackPlacement({
	tracks,
	...placement
}: ResolveTrackPlacementParams): PlacementResult | null {
	const trackType =
		"trackType" in placement
			? placement.trackType
			: getTrackTypeForElementType({
					elementType: placement.elementType,
				});
	const { timeSpans, strategy } = placement;

	if (strategy.type === "explicit") {
		const trackIndex = tracks.findIndex(
			(track) => track.id === strategy.trackId,
		);
		if (trackIndex < 0) {
			return null;
		}

		const track = tracks[trackIndex];
		if (track.type !== trackType) {
			return null;
		}

		return buildExistingTrackResult({ track, trackIndex, tracks, timeSpans });
	}

	if (strategy.type === "firstAvailable") {
		const existingTrackIndex = findFirstAvailableTrackIndex({
			tracks,
			trackType,
			timeSpans,
		});
		if (existingTrackIndex >= 0) {
			return buildExistingTrackResult({
				track: tracks[existingTrackIndex],
				trackIndex: existingTrackIndex,
				tracks,
				timeSpans,
			});
		}

		return resolveAlwaysNewTrack({
			tracks,
			trackType,
			position: "default",
		});
	}

	if (strategy.type === "preferIndex") {
		const preferredTrack = tracks[strategy.trackIndex];
		const isPreferredTrackCompatible =
			!!preferredTrack && preferredTrack.type === trackType;
		const canUseExistingTrack =
			!strategy.createNewTrackOnly &&
			isPreferredTrackCompatible &&
			canPlaceTimeSpansOnTrack({
				track: preferredTrack,
				timeSpans,
			});
		if (canUseExistingTrack) {
			return buildExistingTrackResult({
				track: preferredTrack,
				trackIndex: strategy.trackIndex,
				tracks,
				timeSpans,
			});
		}

		const { insertIndex, insertPosition } = resolvePreferredNewTrackPlacement({
			tracks,
			trackType,
			preferredIndex: strategy.trackIndex,
			direction: getInsertDirection({
				hoverDirection: strategy.hoverDirection,
				verticalDragDirection: !isPreferredTrackCompatible
					? strategy.verticalDragDirection
					: null,
			}),
		});
		return buildNewTrackResult({
			trackType,
			insertIndex,
			insertPosition,
		});
	}

	if (strategy.type === "aboveSource") {
		const aboveTrackIndex = strategy.sourceTrackIndex - 1;
		const aboveTrack = tracks[aboveTrackIndex];
		if (
			aboveTrack &&
			aboveTrack.type === trackType &&
			canPlaceTimeSpansOnTrack({
				track: aboveTrack,
				timeSpans,
			})
		) {
			return buildExistingTrackResult({
				track: aboveTrack,
				trackIndex: aboveTrackIndex,
				tracks,
				timeSpans,
			});
		}

		const firstAvailableTrackIndex = findFirstAvailableTrackIndex({
			tracks,
			trackType,
			timeSpans,
		});
		if (firstAvailableTrackIndex >= 0) {
			return buildExistingTrackResult({
				track: tracks[firstAvailableTrackIndex],
				trackIndex: firstAvailableTrackIndex,
				tracks,
				timeSpans,
			});
		}

		const insertIndex =
			strategy.sourceTrackIndex >= 0
				? strategy.sourceTrackIndex
				: getHighestInsertIndexForTrack({
						tracks,
						trackType,
					});

		return buildNewTrackResult({
			trackType,
			insertIndex,
			insertPosition: null,
		});
	}

	return resolveAlwaysNewTrack({
		tracks,
		trackType,
		position: strategy.position,
	});
}

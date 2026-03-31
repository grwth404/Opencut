import type { TimelineElement, TimelineTrack } from "@/lib/timeline";
import { generateUUID } from "@/utils/id";
import { buildEmptyTrack } from "./track-factory";
import type { PlacementResult } from "./types";

export function applyPlacement({
	tracks,
	placementResult,
	elements,
	newTrackInsertIndexOverride,
}: {
	tracks: TimelineTrack[];
	placementResult: PlacementResult;
	elements: TimelineElement[];
	newTrackInsertIndexOverride?: number;
}): { updatedTracks: TimelineTrack[]; targetTrackId: string } | null {
	if (placementResult.kind === "existingTrack") {
		const targetTrack = tracks[placementResult.trackIndex];
		if (!targetTrack) {
			return null;
		}

		const updatedTracks = tracks.map((track, trackIndex) =>
			trackIndex === placementResult.trackIndex
				? {
						...track,
						elements: [...track.elements, ...elements],
					}
				: track,
		) as TimelineTrack[];

		return { updatedTracks, targetTrackId: targetTrack.id };
	}

	const newTrackId = generateUUID();
	const newTrack = {
		...buildEmptyTrack({ id: newTrackId, type: placementResult.trackType }),
		elements,
	} as TimelineTrack;
	const insertIndex =
		newTrackInsertIndexOverride ?? placementResult.insertIndex;
	const updatedTracks = [...tracks];
	updatedTracks.splice(insertIndex, 0, newTrack);
	return { updatedTracks, targetTrackId: newTrackId };
}

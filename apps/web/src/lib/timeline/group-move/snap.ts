import type { SceneTracks } from "@/lib/timeline";
import {
	findSnapPoints,
	snapToNearestPoint,
	type SnapPoint,
} from "@/lib/timeline/snap-utils";
import type { MoveGroup } from "./types";

export function snapGroupEdges({
	group,
	anchorStartTime,
	tracks,
	playheadTime,
	zoomLevel,
}: {
	group: MoveGroup;
	anchorStartTime: number;
	tracks: SceneTracks;
	playheadTime: number;
	zoomLevel: number;
}): {
	snappedAnchorStartTime: number;
	snapPoint: SnapPoint | null;
} {
	const snapPoints = findSnapPoints({
		tracks,
		playheadTime,
		excludeElementIds: new Set(group.members.map((member) => member.elementId)),
	});

	let closestSnapDistance = Infinity;
	let snappedAnchorStartTime = anchorStartTime;
	let snapPoint: SnapPoint | null = null;

	for (const member of group.members) {
		const memberStartTime = anchorStartTime + member.timeOffset;
		const memberStartSnap = snapToNearestPoint({
			targetTime: memberStartTime,
			snapPoints,
			zoomLevel,
		});
		if (
			memberStartSnap.snapPoint &&
			memberStartSnap.snapDistance < closestSnapDistance
		) {
			closestSnapDistance = memberStartSnap.snapDistance;
			snappedAnchorStartTime = memberStartSnap.snappedTime - member.timeOffset;
			snapPoint = memberStartSnap.snapPoint;
		}

		const memberEndSnap = snapToNearestPoint({
			targetTime: memberStartTime + member.duration,
			snapPoints,
			zoomLevel,
		});
		if (
			memberEndSnap.snapPoint &&
			memberEndSnap.snapDistance < closestSnapDistance
		) {
			closestSnapDistance = memberEndSnap.snapDistance;
			snappedAnchorStartTime =
				memberEndSnap.snappedTime - member.duration - member.timeOffset;
			snapPoint = memberEndSnap.snapPoint;
		}
	}

	return {
		snappedAnchorStartTime,
		snapPoint,
	};
}

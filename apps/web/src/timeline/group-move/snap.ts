import type { SceneTracks } from "@/timeline";
import {
	buildTimelineSnapPoints,
	getTimelineSnapThresholdInTicks,
	resolveTimelineSnap,
	type SnapPoint,
} from "@/timeline/snapping";
import { getElementEdgeSnapPoints } from "@/timeline/element-snap-source";
import { getPlayheadSnapPoints } from "@/timeline/playhead-snap-source";
import { getAnimationKeyframeSnapPointsForTimeline } from "@/timeline/animation-snap-points";
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
	const excludeElementIds = new Set(
		group.members.map((member) => member.elementId),
	);
	const snapPoints = buildTimelineSnapPoints({
		sources: [
			() => getElementEdgeSnapPoints({ tracks, excludeElementIds }),
			() => getPlayheadSnapPoints({ playheadTime }),
			() =>
				getAnimationKeyframeSnapPointsForTimeline({
					tracks,
					excludeElementIds,
				}),
		],
	});
	const maxSnapDistance = getTimelineSnapThresholdInTicks({ zoomLevel });

	let closestSnapDistance = Infinity;
	let snappedAnchorStartTime = anchorStartTime;
	let snapPoint: SnapPoint | null = null;

	for (const member of group.members) {
		const memberStartTime = anchorStartTime + member.timeOffset;
		const memberStartSnap = resolveTimelineSnap({
			targetTime: memberStartTime,
			snapPoints,
			maxSnapDistance,
		});
		if (
			memberStartSnap.snapPoint &&
			memberStartSnap.snapDistance < closestSnapDistance
		) {
			closestSnapDistance = memberStartSnap.snapDistance;
			snappedAnchorStartTime = memberStartSnap.snappedTime - member.timeOffset;
			snapPoint = memberStartSnap.snapPoint;
		}

		const memberEndSnap = resolveTimelineSnap({
			targetTime: memberStartTime + member.duration,
			snapPoints,
			maxSnapDistance,
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

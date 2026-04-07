import type { Bookmark, SceneTracks } from "@/lib/timeline";
import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/lib/timeline/scale";
import { getElementKeyframes } from "@/lib/animation";
import { TICKS_PER_SECOND } from "@/lib/wasm";

export interface SnapPoint {
	time: number;
	type: "element-start" | "element-end" | "playhead" | "bookmark" | "keyframe";
	elementId?: string;
	trackId?: string;
}

export interface SnapResult {
	snappedTime: number;
	snapPoint: SnapPoint | null;
	snapDistance: number;
}

const DEFAULT_SNAP_THRESHOLD_PX = 10;

export function findSnapPoints({
	tracks,
	playheadTime,
	excludeElementId,
	bookmarks = [],
	excludeBookmarkTime,
	enableElementSnapping = true,
	enablePlayheadSnapping = true,
	enableBookmarkSnapping = true,
	enableKeyframeSnapping = true,
}: {
	tracks: SceneTracks;
	playheadTime: number;
	excludeElementId?: string;
	bookmarks?: Array<Bookmark>;
	excludeBookmarkTime?: number;
	enableElementSnapping?: boolean;
	enablePlayheadSnapping?: boolean;
	enableBookmarkSnapping?: boolean;
	enableKeyframeSnapping?: boolean;
}): SnapPoint[] {
	const snapPoints: SnapPoint[] = [];
	const orderedTracks = [...tracks.overlay, tracks.main, ...tracks.audio];

	for (const track of orderedTracks) {
		for (const element of track.elements) {
			if (element.id === excludeElementId) continue;

			if (enableElementSnapping) {
				snapPoints.push(
					{
						time: element.startTime,
						type: "element-start",
						elementId: element.id,
						trackId: track.id,
					},
					{
						time: element.startTime + element.duration,
						type: "element-end",
						elementId: element.id,
						trackId: track.id,
					},
				);
			}

			if (enableKeyframeSnapping) {
				for (const keyframe of getElementKeyframes({
					animations: element.animations,
				})) {
					snapPoints.push({
						time: element.startTime + keyframe.time,
						type: "keyframe",
						elementId: element.id,
						trackId: track.id,
					});
				}
			}
		}
	}

	if (enablePlayheadSnapping) {
		snapPoints.push({ time: playheadTime, type: "playhead" });
	}

	if (enableBookmarkSnapping) {
		for (const bookmark of bookmarks) {
			if (
				excludeBookmarkTime != null &&
				bookmark.time === excludeBookmarkTime
			) {
				continue;
			}
			snapPoints.push({ time: bookmark.time, type: "bookmark" });
		}
	}

	return snapPoints;
}

export function snapToNearestPoint({
	targetTime,
	snapPoints,
	zoomLevel,
	snapThreshold = DEFAULT_SNAP_THRESHOLD_PX,
}: {
	targetTime: number;
	snapPoints: Array<SnapPoint>;
	zoomLevel: number;
	snapThreshold?: number;
}): SnapResult {
	const pixelsPerSecond = BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel;
	const thresholdInTicks = (snapThreshold / pixelsPerSecond) * TICKS_PER_SECOND;

	let closestSnapPoint: SnapPoint | null = null;
	let closestDistance = Infinity;

	for (const snapPoint of snapPoints) {
		const distance = Math.abs(targetTime - snapPoint.time);
		if (distance < thresholdInTicks && distance < closestDistance) {
			closestDistance = distance;
			closestSnapPoint = snapPoint;
		}
	}

	return {
		snappedTime: closestSnapPoint ? closestSnapPoint.time : targetTime,
		snapPoint: closestSnapPoint,
		snapDistance: closestDistance,
	};
}

export function snapElementEdge({
	targetTime,
	elementDuration,
	tracks,
	playheadTime,
	zoomLevel,
	excludeElementId,
	snapToStart = true,
	bookmarks = [],
}: {
	targetTime: number;
	elementDuration: number;
	tracks: SceneTracks;
	playheadTime: number;
	zoomLevel: number;
	excludeElementId?: string;
	snapToStart?: boolean;
	bookmarks?: Array<Bookmark>;
}): SnapResult {
	const snapPoints = findSnapPoints({
		tracks,
		playheadTime,
		excludeElementId,
		bookmarks,
	});

	const effectiveTargetTime = snapToStart
		? targetTime
		: targetTime + elementDuration;

	const snapResult = snapToNearestPoint({
		targetTime: effectiveTargetTime,
		snapPoints,
		zoomLevel,
	});

	if (!snapToStart && snapResult.snapPoint) {
		snapResult.snappedTime = snapResult.snappedTime - elementDuration;
	}

	return snapResult;
}

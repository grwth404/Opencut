export type SnapPointType =
	| "element-start"
	| "element-end"
	| "playhead"
	| "bookmark"
	| "keyframe";

export interface SnapPoint {
	time: number;
	type: SnapPointType;
	elementId?: string;
	trackId?: string;
}

export interface SnapResult {
	snappedTime: number;
	snapPoint: SnapPoint | null;
	snapDistance: number;
}

export type TimelineSnapPointSource = () => Iterable<SnapPoint>;

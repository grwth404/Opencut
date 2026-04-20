import type { SnapPoint } from "@/timeline/snapping";

export function getPlayheadSnapPoints({
	playheadTime,
}: {
	playheadTime: number;
}): SnapPoint[] {
	return [{ time: playheadTime, type: "playhead" }];
}

import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/lib/timeline/scale";
import { TICKS_PER_SECOND } from "@/lib/wasm";

export function getMouseTimeFromClientX({
	clientX,
	containerRect,
	zoomLevel,
	scrollLeft,
}: {
	clientX: number;
	containerRect: DOMRect;
	zoomLevel: number;
	scrollLeft: number;
}): number {
	const mouseX = clientX - containerRect.left + scrollLeft;
	const seconds = Math.max(
		0,
		mouseX / (BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel),
	);
	return Math.round(seconds * TICKS_PER_SECOND);
}

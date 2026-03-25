import { useEffect, useState } from "react";
import { timelineTimeToSnappedPixels } from "@/lib/timeline";
import { TRACK_LABELS_WIDTH_PX } from "@/constants/timeline-constants";
interface UseSnapIndicatorPositionParams {
	snapPoint: { time: number } | null;
	zoomLevel: number;
	timelineRef: React.RefObject<HTMLDivElement | null>;
	tracksScrollRef: React.RefObject<HTMLDivElement | null>;
}

interface SnapIndicatorPosition {
	leftPosition: number;
	topPosition: number;
	height: number;
}

export function useSnapIndicatorPosition({
	snapPoint,
	zoomLevel,
	timelineRef,
	tracksScrollRef,
}: UseSnapIndicatorPositionParams): SnapIndicatorPosition {
	const [scrollLeft, setScrollLeft] = useState(0);

	useEffect(() => {
		const tracksViewport = tracksScrollRef.current;

		if (!tracksViewport) return;

		const handleScroll = () => {
			setScrollLeft(tracksViewport.scrollLeft);
		};

		setScrollLeft(tracksViewport.scrollLeft);

		tracksViewport.addEventListener("scroll", handleScroll);
		return () => tracksViewport.removeEventListener("scroll", handleScroll);
	}, [tracksScrollRef]);

	const timelineContainerHeight = timelineRef.current?.offsetHeight || 400;
	const totalHeight = timelineContainerHeight - 8; // 8px padding from edges

	const timelinePosition = timelineTimeToSnappedPixels({
		time: snapPoint?.time ?? 0,
		zoomLevel,
	});
	const leftPosition = TRACK_LABELS_WIDTH_PX + timelinePosition - scrollLeft;

	return {
		leftPosition,
		topPosition: 0,
		height: totalHeight,
	};
}

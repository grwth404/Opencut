import { useEffect } from "react";

export interface TimelineWheelHandlerProps {
	timelineRef: React.RefObject<HTMLDivElement>;
	isInTimeline: boolean;
	handleWheel: (e: React.WheelEvent) => void;
}

export function useTimelineWheelHandler({
	timelineRef,
	isInTimeline,
	handleWheel,
}: TimelineWheelHandlerProps) {
	useEffect(() => {
		const timelineContainer = timelineRef.current;
		if (!timelineContainer || !isInTimeline) return;

		const handleWheelCapture = (e: WheelEvent) => {
			handleWheel(e as any);
		};

		timelineContainer.addEventListener("wheel", handleWheelCapture, {
			passive: false,
		});

		return () => {
			timelineContainer.removeEventListener("wheel", handleWheelCapture);
		};
	}, [handleWheel, isInTimeline, timelineRef]);

	return null;
}

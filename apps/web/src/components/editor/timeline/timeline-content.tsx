import { SelectionBox } from "../selection-box";
import { TimelinePlayhead } from "./timeline-playhead";
import { SnapIndicator } from "../snap-indicator";
import { TimelineRuler } from "./timeline-ruler";
import { TimelineTracksArea } from "./timeline-tracks-area";
import type { TimelineTrack } from "@/types/timeline";
import type { SnapPoint } from "@/hooks/use-timeline-snapping";

export interface TimelineContentProps {
	dynamicTimelineWidth: number;
	tracks: TimelineTrack[];
	duration: number;
	zoomLevel: number;
	currentTime: number;
	seek: (time: number) => void;
	rulerRef: React.RefObject<HTMLDivElement>;
	rulerScrollRef: React.RefObject<HTMLDivElement>;
	tracksScrollRef: React.RefObject<HTMLDivElement>;
	playheadRef: React.RefObject<HTMLDivElement>;
	trackLabelsRef: React.RefObject<HTMLDivElement>;
	timelineRef: React.RefObject<HTMLDivElement>;
	handleSelectionMouseDown: (e: React.MouseEvent) => void;
	handleTimelineContentClick: (e: React.MouseEvent) => void;
	handleSnapPointChange: (snapPoint: SnapPoint | null) => void;
	clearSelectedElements: () => void;
	selectionBox: {
		startPos: { x: number; y: number } | null;
		currentPos: { x: number; y: number } | null;
		isActive: boolean;
	} | null;
	tracksContainerRef: React.RefObject<HTMLDivElement>;
	currentSnapPoint: SnapPoint | null;
	showSnapIndicator: boolean;
}

export function TimelineContent({
	dynamicTimelineWidth,
	tracks,
	duration,
	zoomLevel,
	currentTime,
	seek,
	rulerRef,
	rulerScrollRef,
	tracksScrollRef,
	playheadRef,
	trackLabelsRef,
	timelineRef,
	handleSelectionMouseDown,
	handleTimelineContentClick,
	handleSnapPointChange,
	clearSelectedElements,
	selectionBox,
	tracksContainerRef,
	currentSnapPoint,
	showSnapIndicator,
}: TimelineContentProps) {
	return (
		<div
			className="relative min-w-max min-h-max"
			style={{ minWidth: `${dynamicTimelineWidth}px` }}
		>
			<div
				className={`h-full grid grid-cols-[192px_1fr] ${tracks.length > 0 ? `grid-rows-[20px_repeat(${tracks.length},minmax(0,max-content))]` : "grid-rows-[20px_1fr]"}`}
			>
				{/* Top-Left Corner (Empty space above track labels) */}
				<div className="sticky top-0 left-0 border-inset bg-card"></div>

				{/* Top Row (Sticky Ruler Header) */}
				<TimelineRuler
					duration={duration}
					zoomLevel={zoomLevel}
					currentTime={currentTime}
					seek={seek}
					rulerRef={rulerRef}
					rulerScrollRef={rulerScrollRef}
					tracksScrollRef={tracksScrollRef}
					playheadRef={playheadRef}
					handleSelectionMouseDown={handleSelectionMouseDown}
					handleTimelineContentClick={handleTimelineContentClick}
				/>

				{/* Track Rows */}
				<TimelineTracksArea
					tracks={tracks}
					zoomLevel={zoomLevel}
					handleSnapPointChange={handleSnapPointChange}
					clearSelectedElements={clearSelectedElements}
				/>
			</div>

			{/* Overlay Components - positioned absolutely relative to the timeline container */}
			<SelectionBox
				startPos={selectionBox?.startPos || null}
				currentPos={selectionBox?.currentPos || null}
				containerRef={tracksContainerRef}
				isActive={selectionBox?.isActive || false}
			/>

			<TimelinePlayhead
				currentTime={currentTime}
				duration={duration}
				zoomLevel={zoomLevel}
				tracks={tracks}
				seek={seek}
				rulerRef={rulerRef}
				rulerScrollRef={rulerScrollRef}
				tracksScrollRef={tracksScrollRef}
				trackLabelsRef={trackLabelsRef}
				timelineRef={timelineRef}
				playheadRef={playheadRef}
				isSnappingToPlayhead={
					showSnapIndicator && currentSnapPoint?.type === "playhead"
				}
			/>

			<SnapIndicator
				snapPoint={currentSnapPoint}
				zoomLevel={zoomLevel}
				tracks={tracks}
				timelineRef={timelineRef}
				trackLabelsRef={trackLabelsRef}
				isVisible={showSnapIndicator}
			/>
		</div>
	);
}

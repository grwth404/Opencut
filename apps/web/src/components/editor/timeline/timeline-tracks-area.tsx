import { Fragment } from "react";
import { Plus } from "lucide-react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "../../ui/context-menu";
import { useTimelineStore } from "@/stores/timeline-store";
import { TimelineTrackContent } from "../timeline-track";
import { TrackIcon } from "./track-icon";
import { getTrackHeight } from "@/constants/timeline-constants";
import type { TimelineTrack } from "@/types/timeline";
import type { SnapPoint } from "@/hooks/use-timeline-snapping";

export interface TimelineTracksAreaProps {
	tracks: TimelineTrack[];
	zoomLevel: number;
	handleSnapPointChange: (snapPoint: SnapPoint | null) => void;
	clearSelectedElements: () => void;
}

export function TimelineTracksArea({
	tracks,
	zoomLevel,
	handleSnapPointChange,
	clearSelectedElements,
}: TimelineTracksAreaProps) {
	const { addTrack, toggleTrackMute } = useTimelineStore();

	return (
		<>
			{/* Track Rows */}
			{tracks.map((track, index) => (
				<Fragment key={track.id}>
					{/* Left Column (Sticky Track Labels) */}
					<div
						className="sticky left-0 flex items-center border-b border-panel border-inset group bg-card z-[100]"
						style={{ height: `${getTrackHeight(track.type)}px` }}
					>
						<div className="flex items-center gap-2 px-2">
							<TrackIcon track={track} />
						</div>
						{track.muted && (
							<span className="text-xs text-red-500 font-semibold">Muted</span>
						)}
					</div>

					{/* Scrollable Track Content */}
					<ContextMenu>
						<ContextMenuTrigger asChild>
							<div
								className=" h-full"
								onClick={(e) => {
									// If clicking empty area (not on a element), deselect all elements
									if (!(e.target as HTMLElement).closest(".timeline-element")) {
										clearSelectedElements();
									}
								}}
							>
								<TimelineTrackContent
									track={track}
									zoomLevel={zoomLevel}
									onSnapPointChange={handleSnapPointChange}
								/>
							</div>
						</ContextMenuTrigger>
						<ContextMenuContent>
							<ContextMenuItem onClick={() => toggleTrackMute(track.id)}>
								{track.muted ? "Unmute Track" : "Mute Track"}
							</ContextMenuItem>
							<ContextMenuItem>Track settings (soon)</ContextMenuItem>
						</ContextMenuContent>
					</ContextMenu>
				</Fragment>
			))}
			{/* Add Track Button - spans full width */}
			<div
				onClick={() => addTrack("media")}
				className="col-span-1 sticky left-0 w-full flex items-center border-b border-muted bg-card hover:bg-card/50 transition-colors cursor-pointer z-[100]"
				style={{ height: `${getTrackHeight("media")}px` }}
			>
				<div className="w-full flex  justify-center items-center">
					<Plus className="w-4 h-4 text-muted-foreground" />
				</div>
			</div>
		</>
	);
}

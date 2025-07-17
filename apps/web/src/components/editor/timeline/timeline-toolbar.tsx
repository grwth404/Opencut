import { Button } from "../../ui/button";
import {
	Scissors,
	ArrowLeftToLine,
	ArrowRightToLine,
	Trash2,
	Snowflake,
	Copy,
	SplitSquareHorizontal,
	Pause,
	Play,
	Lock,
	LockOpen,
} from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
	TooltipProvider,
} from "../../ui/tooltip";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";

export interface TimelineToolbarProps {
	handleSplitSelected: () => void;
	handleSplitAndKeepLeft: () => void;
	handleSplitAndKeepRight: () => void;
	handleSeparateAudio: () => void;
	handleDuplicateSelected: () => void;
	handleFreezeSelected: () => void;
	handleDeleteSelected: () => void;
}

export function TimelineToolbar({
	handleSplitSelected,
	handleSplitAndKeepLeft,
	handleSplitAndKeepRight,
	handleSeparateAudio,
	handleDuplicateSelected,
	handleFreezeSelected,
	handleDeleteSelected,
}: TimelineToolbarProps) {
	const {
		tracks,
		addTrack,
		addElementToTrack,
		snappingEnabled,
		toggleSnapping,
	} = useTimelineStore();
	const { currentTime, duration, isPlaying, toggle } = usePlaybackStore();

	return (
		<div className="border-b flex items-center justify-between px-2 py-1 bg-card z-90">
			<div className="flex items-center gap-1 w-full">
				<TooltipProvider delayDuration={500}>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="text"
								size="icon"
								onClick={toggle}
								className="mr-2"
							>
								{isPlaying ? (
									<Pause className="h-4 w-4" />
								) : (
									<Play className="h-4 w-4" />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							{isPlaying ? "Pause (Space)" : "Play (Space)"}
						</TooltipContent>
					</Tooltip>
					<div className="w-px h-6 bg-border mx-1" />
					<div
						className="text-xs text-muted-foreground font-mono px-2"
						style={{ minWidth: "18ch", textAlign: "center" }}
					>
						{currentTime.toFixed(1)}s / {duration.toFixed(1)}s
					</div>
					{tracks.length === 0 && (
						<>
							<div className="w-px h-6 bg-border mx-1" />
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											const trackId = addTrack("media");
											addElementToTrack(trackId, {
												type: "media",
												mediaId: "test",
												name: "Test Clip",
												duration: TIMELINE_CONSTANTS.DEFAULT_TEXT_DURATION,
												startTime: 0,
												trimStart: 0,
												trimEnd: 0,
											});
										}}
										className="text-xs"
									>
										Add Test Clip
									</Button>
								</TooltipTrigger>
								<TooltipContent>Add a test clip to try playback</TooltipContent>
							</Tooltip>
						</>
					)}
					<div className="w-px h-6 bg-border mx-1" />
					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant="text" size="icon" onClick={handleSplitSelected}>
								<Scissors className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Split element (Ctrl+S)</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="text"
								size="icon"
								onClick={handleSplitAndKeepLeft}
							>
								<ArrowLeftToLine className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Split and keep left (Ctrl+Q)</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="text"
								size="icon"
								onClick={handleSplitAndKeepRight}
							>
								<ArrowRightToLine className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Split and keep right (Ctrl+W)</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant="text" size="icon" onClick={handleSeparateAudio}>
								<SplitSquareHorizontal className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Separate audio (Ctrl+D)</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="text"
								size="icon"
								onClick={handleDuplicateSelected}
							>
								<Copy className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Duplicate element (Ctrl+D)</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant="text" size="icon" onClick={handleFreezeSelected}>
								<Snowflake className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Freeze frame (F)</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant="text" size="icon" onClick={handleDeleteSelected}>
								<Trash2 className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Delete element (Delete)</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
			<div className="flex items-center gap-1">
				<TooltipProvider delayDuration={500}>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant="text" size="icon" onClick={toggleSnapping}>
								{snappingEnabled ? (
									<Lock className="h-4 w-4" />
								) : (
									<LockOpen className="h-4 w-4 text-primary" />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent>Auto snapping</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		</div>
	);
}

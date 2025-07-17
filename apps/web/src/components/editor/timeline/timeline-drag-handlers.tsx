import { useState, useRef } from "react";
import { toast } from "sonner";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { processMediaFiles } from "@/lib/media-processing";
import type { DragData } from "@/types/timeline";

export interface TimelineDragHandlersProps {
	isDragOver: boolean;
	setIsDragOver: (isDragOver: boolean) => void;
	isProcessing: boolean;
	setIsProcessing: (isProcessing: boolean) => void;
	progress: number;
	setProgress: (progress: number) => void;
}

export function useTimelineDragHandlers({
	isDragOver,
	setIsDragOver,
	isProcessing,
	setIsProcessing,
	progress,
	setProgress,
}: TimelineDragHandlersProps) {
	const { mediaItems, addMediaItem } = useMediaStore();
	const { activeProject } = useProjectStore();
	const dragCounterRef = useRef(0);

	const handleDragEnter = (e: React.DragEvent) => {
		// When something is dragged over the timeline, show overlay
		e.preventDefault();
		// Don't show overlay for timeline elements - they're handled by tracks
		if (e.dataTransfer.types.includes("application/x-timeline-element")) {
			return;
		}
		dragCounterRef.current += 1;
		if (!isDragOver) {
			setIsDragOver(true);
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();

		// Don't update state for timeline elements - they're handled by tracks
		if (e.dataTransfer.types.includes("application/x-timeline-element")) {
			return;
		}

		dragCounterRef.current -= 1;
		if (dragCounterRef.current === 0) {
			setIsDragOver(false);
		}
	};

	const handleDrop = async (e: React.DragEvent) => {
		// When media is dropped, add it as a new track/element
		e.preventDefault();
		setIsDragOver(false);
		dragCounterRef.current = 0;

		// Ignore timeline element drags - they're handled by track-specific handlers
		const hasTimelineElement = e.dataTransfer.types.includes(
			"application/x-timeline-element",
		);
		if (hasTimelineElement) {
			return;
		}

		const itemData = e.dataTransfer.getData("application/x-media-item");
		if (itemData) {
			try {
				const dragData: DragData = JSON.parse(itemData);

				if (dragData.type === "text") {
					// Always create new text track to avoid overlaps
					useTimelineStore.getState().addTextToNewTrack(dragData);
				} else {
					// Handle media items
					const mediaItem = mediaItems.find(
						(item: any) => item.id === dragData.id,
					);
					if (!mediaItem) {
						toast.error("Media item not found");
						return;
					}

					useTimelineStore.getState().addMediaToNewTrack(mediaItem);
				}
			} catch (error) {
				console.error("Error parsing dropped item data:", error);
				toast.error("Failed to add item to timeline");
			}
		} else if (e.dataTransfer.files?.length > 0) {
			// Handle file drops by creating new tracks
			if (!activeProject) {
				toast.error("No active project");
				return;
			}

			setIsProcessing(true);
			setProgress(0);
			try {
				const processedItems = await processMediaFiles(
					e.dataTransfer.files,
					(p) => setProgress(p),
				);
				for (const processedItem of processedItems) {
					await addMediaItem(activeProject.id, processedItem);
					const currentMediaItems = useMediaStore.getState().mediaItems;
					const addedItem = currentMediaItems.find(
						(item) =>
							item.name === processedItem.name &&
							item.url === processedItem.url,
					);
					if (addedItem) {
						useTimelineStore.getState().addMediaToNewTrack(addedItem);
					}
				}
			} catch (error) {
				// Show error if file processing fails
				console.error("Error processing external files:", error);
				toast.error("Failed to process dropped files");
			} finally {
				setIsProcessing(false);
				setProgress(0);
			}
		}
	};

	const dragProps = {
		onDragEnter: handleDragEnter,
		onDragOver: handleDragOver,
		onDragLeave: handleDragLeave,
		onDrop: handleDrop,
	};

	return { dragProps };
}

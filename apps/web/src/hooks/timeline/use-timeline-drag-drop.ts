import { useState, useCallback, type RefObject } from "react";
import { useEditor } from "@/hooks/use-editor";
import { processMediaAssets } from "@/lib/media/processing";
import { toast } from "sonner";
import { showMediaUploadToast } from "@/lib/media/upload-toast";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { snapTimeToFrame } from "@/lib/time";
import {
	buildTextElement,
	buildGraphicElement,
	buildStickerElement,
	buildElementFromMedia,
	buildEffectElement,
} from "@/lib/timeline/element-utils";
import { AddTrackCommand, InsertElementCommand } from "@/lib/commands/timeline";
import { BatchCommand } from "@/lib/commands";
import { computeDropTarget } from "@/lib/timeline/drop-utils";
import { getDragData, hasDragData } from "@/lib/drag-data";
import { isMainTrack } from "@/lib/timeline/track-utils";
import type { TrackType, DropTarget, ElementType } from "@/lib/timeline";
import type {
	MediaDragData,
	GraphicDragData,
	StickerDragData,
	EffectDragData,
} from "@/lib/timeline/drag";

interface UseTimelineDragDropProps {
	containerRef: RefObject<HTMLDivElement | null>;
	headerRef?: RefObject<HTMLElement | null>;
	tracksScrollRef?: RefObject<HTMLDivElement | null>;
	zoomLevel: number;
}

export function useTimelineDragDrop({
	containerRef,
	headerRef,
	tracksScrollRef,
	zoomLevel,
}: UseTimelineDragDropProps) {
	const editor = useEditor();
	const [isDragOver, setIsDragOver] = useState(false);
	const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
	const [dragElementType, setElementType] = useState<ElementType | null>(null);

	const getSnappedTime = useCallback(
		({ time }: { time: number }) => {
			const projectFps = editor.project.getActive().settings.fps;
			return snapTimeToFrame({ time, fps: projectFps });
		},
		[editor],
	);

	const getElementType = useCallback(
		({ dataTransfer }: { dataTransfer: DataTransfer }): ElementType | null => {
			const dragData = getDragData({ dataTransfer });
			if (!dragData) return null;

			if (dragData.type === "text") return "text";
			if (dragData.type === "graphic") return "graphic";
			if (dragData.type === "sticker") return "sticker";
			if (dragData.type === "effect") return "effect";
			if (dragData.type === "media") {
				return dragData.mediaType;
			}
			return null;
		},
		[],
	);

	const getElementDuration = useCallback(
		({
			elementType,
			mediaId,
		}: {
			elementType: ElementType;
			mediaId?: string;
		}): number => {
			if (
				elementType === "text" ||
				elementType === "graphic" ||
				elementType === "sticker" ||
				elementType === "effect"
			) {
				return TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION;
			}
			if (mediaId) {
				const mediaAssets = editor.media.getAssets();
				const media = mediaAssets.find((m) => m.id === mediaId);
				return media?.duration ?? TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION;
			}
			return TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION;
		},
		[editor],
	);

	const handleDragEnter = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		const hasAsset = hasDragData({ dataTransfer: e.dataTransfer });
		const hasFiles = e.dataTransfer.types.includes("Files");
		if (!hasAsset && !hasFiles) return;
		setIsDragOver(true);
	}, []);

	const handleDragOver = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();

			const scrollContainer = tracksScrollRef?.current;
			const referenceRect =
				scrollContainer?.getBoundingClientRect() ??
				containerRef.current?.getBoundingClientRect();
			if (!referenceRect) return;

			const headerHeight =
				headerRef?.current?.getBoundingClientRect().height ?? 0;
			const scrollLeft = scrollContainer?.scrollLeft ?? 0;
			const scrollTop = scrollContainer?.scrollTop ?? 0;
			const hasFiles = e.dataTransfer.types.includes("Files");
			const isExternal =
				hasFiles && !hasDragData({ dataTransfer: e.dataTransfer });

			const elementType = getElementType({ dataTransfer: e.dataTransfer });

			if (!elementType && hasFiles && isExternal) {
				setDropTarget(null);
				setElementType(null);
				return;
			}

			if (!elementType) return;

			setElementType(elementType);

			const dragData = getDragData({ dataTransfer: e.dataTransfer });
			const duration = getElementDuration({
				elementType,
				mediaId: dragData?.type === "media" ? dragData.id : undefined,
			});

			const mouseX = e.clientX - referenceRect.left + scrollLeft;
			const mouseY = e.clientY - referenceRect.top + scrollTop - headerHeight;

			const targetElementTypes =
				dragData?.type === "effect"
					? (dragData as EffectDragData).targetElementTypes
					: dragData?.type === "media"
						? (dragData as MediaDragData).targetElementTypes
						: undefined;

			const tracks = editor.timeline.getTracks();
			const currentTime = editor.playback.getCurrentTime();
			const target = computeDropTarget({
				elementType,
				mouseX,
				mouseY,
				tracks,
				playheadTime: currentTime,
				isExternalDrop: isExternal,
				elementDuration: duration,
				pixelsPerSecond: TIMELINE_CONSTANTS.PIXELS_PER_SECOND,
				zoomLevel,
				targetElementTypes,
			});

			target.xPosition = getSnappedTime({ time: target.xPosition });

			setDropTarget(target);
			e.dataTransfer.dropEffect = "copy";
		},
		[
			containerRef,
			headerRef,
			tracksScrollRef,
			zoomLevel,
			getElementType,
			getElementDuration,
			getSnappedTime,
			editor,
		],
	);

	const handleDragLeave = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			const rect = containerRef.current?.getBoundingClientRect();
			if (rect) {
				const { clientX, clientY } = e;
				if (
					clientX < rect.left ||
					clientX > rect.right ||
					clientY < rect.top ||
					clientY > rect.bottom
				) {
					setIsDragOver(false);
					setDropTarget(null);
					setElementType(null);
				}
			}
		},
		[containerRef],
	);

	const executeTextDrop = useCallback(
		({
			target,
			dragData,
		}: {
			target: DropTarget;
			dragData: { name?: string; content?: string };
		}) => {
			const element = buildTextElement({
				raw: {
					name: dragData.name ?? "",
					content: dragData.content ?? "",
				},
				startTime: target.xPosition,
			});

			if (target.isNewTrack) {
				const addTrackCmd = new AddTrackCommand("text", target.trackIndex);
				const insertCmd = new InsertElementCommand({
					element,
					placement: { mode: "explicit", trackId: addTrackCmd.getTrackId() },
				});
				editor.command.execute({
					command: new BatchCommand([addTrackCmd, insertCmd]),
				});
				return;
			}

			const tracks = editor.timeline.getTracks();
			const track = tracks[target.trackIndex];
			if (!track) return;
			editor.timeline.insertElement({
				placement: { mode: "explicit", trackId: track.id },
				element,
			});
		},
		[editor],
	);

	const executeStickerDrop = useCallback(
		({
			target,
			dragData,
		}: {
			target: DropTarget;
			dragData: StickerDragData;
		}) => {
			const element = buildStickerElement({
				stickerId: dragData.stickerId,
				name: dragData.name,
				startTime: target.xPosition,
			});

			if (target.isNewTrack) {
				const addTrackCmd = new AddTrackCommand("graphic", target.trackIndex);
				const insertCmd = new InsertElementCommand({
					element,
					placement: { mode: "explicit", trackId: addTrackCmd.getTrackId() },
				});
				editor.command.execute({
					command: new BatchCommand([addTrackCmd, insertCmd]),
				});
				return;
			}

			const tracks = editor.timeline.getTracks();
			const track = tracks[target.trackIndex];
			if (!track) return;
			editor.timeline.insertElement({
				placement: { mode: "explicit", trackId: track.id },
				element,
			});
		},
		[editor],
	);

	const executeGraphicDrop = useCallback(
		({
			target,
			dragData,
		}: {
			target: DropTarget;
			dragData: GraphicDragData;
		}) => {
			const element = buildGraphicElement({
				definitionId: dragData.definitionId,
				name: dragData.name,
				startTime: target.xPosition,
				params: dragData.params,
			});

			if (target.isNewTrack) {
				const addTrackCmd = new AddTrackCommand("graphic", target.trackIndex);
				const insertCmd = new InsertElementCommand({
					element,
					placement: { mode: "explicit", trackId: addTrackCmd.getTrackId() },
				});
				editor.command.execute({
					command: new BatchCommand([addTrackCmd, insertCmd]),
				});
				return;
			}

			const tracks = editor.timeline.getTracks();
			const track = tracks[target.trackIndex];
			if (!track) return;
			editor.timeline.insertElement({
				placement: { mode: "explicit", trackId: track.id },
				element,
			});
		},
		[editor],
	);

	const executeMediaDrop = useCallback(
		({ target, dragData }: { target: DropTarget; dragData: MediaDragData }) => {
			if (target.targetElement) {
				toast.info("Replace media source is coming soon!");
				return;
			}

			const mediaAssets = editor.media.getAssets();
			const mediaAsset = mediaAssets.find((m) => m.id === dragData.id);
			if (!mediaAsset) return;

			const trackType: TrackType =
				dragData.mediaType === "audio" ? "audio" : "video";

			const duration =
				mediaAsset.duration ?? TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION;
			const element = buildElementFromMedia({
				mediaId: mediaAsset.id,
				mediaType: mediaAsset.type,
				name: mediaAsset.name,
				duration,
				startTime: target.xPosition,
			});

			if (target.isNewTrack) {
				const addTrackCmd = new AddTrackCommand(trackType, target.trackIndex);
				const insertCmd = new InsertElementCommand({
					element,
					placement: { mode: "explicit", trackId: addTrackCmd.getTrackId() },
				});
				editor.command.execute({
					command: new BatchCommand([addTrackCmd, insertCmd]),
				});
				return;
			}

			const tracks = editor.timeline.getTracks();
			const track = tracks[target.trackIndex];
			if (!track) return;
			editor.timeline.insertElement({
				placement: { mode: "explicit", trackId: track.id },
				element,
			});
		},
		[editor],
	);

	const executeEffectDrop = useCallback(
		({
			target,
			dragData,
		}: {
			target: DropTarget;
			dragData: EffectDragData;
		}) => {
			if (target.targetElement) {
				editor.timeline.addClipEffect({
					trackId: target.targetElement.trackId,
					elementId: target.targetElement.elementId,
					effectType: dragData.effectType,
				});
				return;
			}

			const tracks = editor.timeline.getTracks();
			const effectTrack = tracks.find((t) => t.type === "effect");
			let trackId: string;

			if (effectTrack) {
				trackId = effectTrack.id;
			} else if (target.isNewTrack) {
				const addTrackCmd = new AddTrackCommand("effect", target.trackIndex);
				const insertCmd = new InsertElementCommand({
					element: buildEffectElement({
						effectType: dragData.effectType,
						startTime: target.xPosition,
					}),
					placement: { mode: "explicit", trackId: addTrackCmd.getTrackId() },
				});
				editor.command.execute({
					command: new BatchCommand([addTrackCmd, insertCmd]),
				});
				return;
			} else {
				const track = tracks[target.trackIndex];
				if (!track || track.type !== "effect") return;
				trackId = track.id;
			}

			const element = buildEffectElement({
				effectType: dragData.effectType,
				startTime: target.xPosition,
			});

			editor.timeline.insertElement({
				placement: { mode: "explicit", trackId },
				element,
			});
		},
		[editor],
	);

	const executeFileDrop = useCallback(
		async ({
			files,
			mouseX,
			mouseY,
		}: {
			files: File[];
			mouseX: number;
			mouseY: number;
		}) => {
			const activeProject = editor.project.getActiveOrNull();
			if (!activeProject) return;

			await showMediaUploadToast({
				filesCount: files.length,
				promise: async () => {
					const processedAssets = await processMediaAssets({ files });
					const projectId = activeProject.metadata.id;

					for (const asset of processedAssets) {
						const createdAsset = await editor.media.addMediaAsset({
							projectId,
							asset,
						});
						if (!createdAsset) continue;

						const duration =
							createdAsset.duration ?? TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION;
						const currentTracks = editor.timeline.getTracks();
						const currentTime = editor.playback.getCurrentTime();
						const onlyTrack = currentTracks[0];
						const reuseMainTrackId =
							createdAsset.type !== "audio" &&
							currentTracks.length === 1 &&
							!!onlyTrack &&
							isMainTrack(onlyTrack) &&
							onlyTrack.elements.length === 0
								? onlyTrack.id
								: null;
						const dropTarget = reuseMainTrackId
							? null
							: computeDropTarget({
									elementType: createdAsset.type,
									mouseX,
									mouseY,
									tracks: currentTracks,
									playheadTime: currentTime,
									isExternalDrop: true,
									elementDuration: duration,
									pixelsPerSecond: TIMELINE_CONSTANTS.PIXELS_PER_SECOND,
									zoomLevel,
								});

						const trackType: TrackType =
							createdAsset.type === "audio" ? "audio" : "video";

						let trackId: string | undefined;
						if (reuseMainTrackId) {
							trackId = reuseMainTrackId;
						} else {
							if (!dropTarget) continue;
							if (dropTarget.isNewTrack) {
								const addTrackCmd = new AddTrackCommand(
									trackType,
									dropTarget.trackIndex,
								);
								trackId = addTrackCmd.getTrackId();
								editor.command.execute({ command: addTrackCmd });
							} else {
								trackId = currentTracks[dropTarget.trackIndex]?.id;
							}
						}

						if (!trackId) continue;

						const element = buildElementFromMedia({
							mediaId: createdAsset.id,
							mediaType: createdAsset.type,
							name: createdAsset.name,
							duration,
							startTime: dropTarget?.xPosition ?? currentTime,
							buffer:
								createdAsset.type === "audio"
									? new AudioBuffer({ length: 1, sampleRate: 44100 })
									: undefined,
						});

						const insertCmd = new InsertElementCommand({
							element,
							placement: { mode: "explicit", trackId },
						});
						editor.command.execute({ command: insertCmd });
					}

					return {
						uploadedCount: processedAssets.length,
						assetNames: processedAssets.map((asset) => asset.name),
					};
				},
			});
		},
		[editor, zoomLevel],
	);

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();

			const hasAsset = hasDragData({ dataTransfer: e.dataTransfer });
			const hasFiles = e.dataTransfer.files?.length > 0;

			if (!hasAsset && !hasFiles) return;

			const currentTarget = dropTarget;
			setIsDragOver(false);
			setDropTarget(null);
			setElementType(null);

			try {
				if (hasAsset) {
					if (!currentTarget) return;
					const dragData = getDragData({ dataTransfer: e.dataTransfer });
					if (!dragData) return;

					if (dragData.type === "text") {
						executeTextDrop({ target: currentTarget, dragData });
					} else if (dragData.type === "graphic") {
						executeGraphicDrop({
							target: currentTarget,
							dragData: dragData as GraphicDragData,
						});
					} else if (dragData.type === "sticker") {
						executeStickerDrop({ target: currentTarget, dragData });
					} else if (dragData.type === "effect") {
						executeEffectDrop({
							target: currentTarget,
							dragData: dragData as EffectDragData,
						});
					} else {
						executeMediaDrop({ target: currentTarget, dragData });
					}
				} else if (hasFiles) {
					const scrollContainer = tracksScrollRef?.current;
					const referenceRect =
						scrollContainer?.getBoundingClientRect() ??
						containerRef.current?.getBoundingClientRect();
					if (!referenceRect) return;
					const scrollLeft = scrollContainer?.scrollLeft ?? 0;
					const scrollTop = scrollContainer?.scrollTop ?? 0;
					const mouseX = e.clientX - referenceRect.left + scrollLeft;
					const headerHeight =
						headerRef?.current?.getBoundingClientRect().height ?? 0;
					const mouseY =
						e.clientY - referenceRect.top + scrollTop - headerHeight;
					await executeFileDrop({
						files: Array.from(e.dataTransfer.files),
						mouseX,
						mouseY,
					});
				}
			} catch (err) {
				console.error("Failed to process drop:", err);
			}
		},
		[
			dropTarget,
			executeTextDrop,
			executeGraphicDrop,
			executeStickerDrop,
			executeMediaDrop,
			executeEffectDrop,
			executeFileDrop,
			containerRef,
			headerRef,
			tracksScrollRef,
		],
	);

	return {
		isDragOver,
		dropTarget,
		dragElementType,
		dragProps: {
			onDragEnter: handleDragEnter,
			onDragOver: handleDragOver,
			onDragLeave: handleDragLeave,
			onDrop: handleDrop,
		},
	};
}

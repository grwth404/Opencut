import { useCallback, useEffect, useRef, useState } from "react";
import { usePreviewViewport } from "@/components/editor/panels/preview/preview-viewport";
import { useEditor } from "@/hooks/use-editor";
import { useShiftKey } from "@/hooks/use-shift-key";
import { masksRegistry } from "@/lib/masks";
import {
	parseCustomMaskHandleId,
	parseCustomMaskSegmentHandleId,
} from "@/lib/masks/custom-path";
import { appendPointToCustomMask } from "@/lib/masks/definitions/custom";
import {
	getVisibleElementsWithBounds,
	type ElementBounds,
} from "@/lib/preview/element-bounds";
import {
	SNAP_THRESHOLD_SCREEN_PIXELS,
	type SnapLine,
} from "@/lib/preview/preview-snap";
import type { SelectedMaskPointSelection } from "@/lib/selection/editor-selection";
import type { Mask, MaskInteractionResult } from "@/lib/masks/types";
import type { MaskableElement } from "@/lib/timeline";
import { registerCanceller } from "@/lib/cancel-interaction";

interface DragState {
	trackId: string;
	elementId: string;
	handleId: string;
	startCanvasX: number;
	startCanvasY: number;
	startParams: Mask["params"];
}

interface PendingSegmentInsertState {
	trackId: string;
	elementId: string;
	maskId: string;
	segmentIndex: number;
	startClientX: number;
	startClientY: number;
	startCanvasX: number;
	startCanvasY: number;
	startParams: Mask["params"];
	bounds: ElementBounds;
}

const SEGMENT_CLICK_DRAG_THRESHOLD_PX = 4;

function isMaskSelectionForElement({
	trackId,
	elementId,
	maskId,
	selection,
}: {
	trackId: string;
	elementId: string;
	maskId: string;
	selection: SelectedMaskPointSelection | null;
}): boolean {
	if (!selection) {
		return false;
	}
	return (
		selection.trackId === trackId &&
		selection.elementId === elementId &&
		selection.maskId === maskId
	);
}

function replaceElementMask({
	masks,
	updatedMask,
}: {
	masks: MaskableElement["masks"];
	updatedMask: Mask;
}): Mask[] {
	return (masks ?? []).map((mask) =>
		mask.id === updatedMask.id ? updatedMask : mask,
	);
}

function withUpdatedMaskParams<TMask extends Mask>({
	mask,
	params,
}: {
	mask: TMask;
	params: TMask["params"];
}): TMask {
	return {
		...mask,
		params,
	};
}

export function useMaskHandles({
	onSnapLinesChange,
}: {
	onSnapLinesChange?: (lines: SnapLine[]) => void;
}) {
	const editor = useEditor();
	const isShiftHeldRef = useShiftKey();
	const viewport = usePreviewViewport();
	const [activeHandleId, setActiveHandleId] = useState<string | null>(null);
	const dragStateRef = useRef<DragState | null>(null);
	const pendingSegmentInsertRef = useRef<PendingSegmentInsertState | null>(
		null,
	);
	const captureRef = useRef<{ element: HTMLElement; pointerId: number } | null>(
		null,
	);

	const tracks = useEditor(
		(e) => e.timeline.getPreviewTracks() ?? e.scenes.getActiveScene().tracks,
	);
	const currentTime = useEditor((e) => e.playback.getCurrentTime());
	const mediaAssets = useEditor((e) => e.media.getAssets());
	const canvasSize = useEditor(
		(e) => e.project.getActive().settings.canvasSize,
	);
	const selectedElements = useEditor((e) => e.selection.getSelectedElements());
	const selectedMaskPointSelection = useEditor((e) =>
		e.selection.getSelectedMaskPointSelection(),
	);

	const elementsWithBounds = getVisibleElementsWithBounds({
		tracks,
		currentTime,
		canvasSize,
		mediaAssets,
	});

	const selectedWithMask =
		selectedElements.length === 1
			? (() => {
					const sel = selectedElements[0];
					const entry = elementsWithBounds.find(
						(item) =>
							item.trackId === sel.trackId && item.elementId === sel.elementId,
					);
					if (!entry) return null;
					const element = entry.element as MaskableElement;
					const masks = element.masks ?? [];
					if (masks.length === 0) return null;
					const activeMaskId = masks.some((mask) =>
						isMaskSelectionForElement({
							trackId: entry.trackId,
							elementId: entry.elementId,
							maskId: mask.id,
							selection: selectedMaskPointSelection,
						}),
					)
						? selectedMaskPointSelection?.maskId
						: masks[0].id;
					const mask =
						masks.find((candidate) => candidate.id === activeMaskId) ??
						masks[0];
					return { ...entry, element, mask };
				})()
			: null;

	const { handles: baseHandlePositions, overlays }: MaskInteractionResult =
		selectedWithMask
			? (() => {
					const def = masksRegistry.get(selectedWithMask.mask.type);
					const { x: scaleX, y: scaleY } = viewport.getDisplayScale();
					const displayScale = (scaleX + scaleY) / 2;
					return def.interaction.getInteraction({
						params: selectedWithMask.mask.params,
						bounds: selectedWithMask.bounds,
						displayScale,
						scaleX,
						scaleY,
					});
				})()
			: { handles: [], overlays: [] };

	const selectedPointIds = new Set(
		selectedWithMask &&
			isMaskSelectionForElement({
				trackId: selectedWithMask.trackId,
				elementId: selectedWithMask.elementId,
				maskId: selectedWithMask.mask.id,
				selection: selectedMaskPointSelection,
			})
			? (selectedMaskPointSelection?.pointIds ?? [])
			: [],
	);

	const handlePositions = baseHandlePositions.map((handle) => {
		const parsedHandle = parseCustomMaskHandleId({ handleId: handle.id });
		if (!parsedHandle || parsedHandle.part !== "anchor") {
			return handle;
		}
		return {
			...handle,
			isSelected: selectedPointIds.has(parsedHandle.pointId),
		};
	});

	const customMaskPointIds =
		selectedWithMask?.mask.type === "custom"
			? handlePositions
					.filter((h) => h.kind === "point")
					.map((h) => {
						const parsedHandle = parseCustomMaskHandleId({ handleId: h.id });
						return parsedHandle?.part === "anchor"
							? parsedHandle.pointId
							: null;
					})
					.filter((id): id is string => id !== null)
			: [];
	const isCreatingCustomMask =
		selectedWithMask?.mask.type === "custom" &&
		(!selectedWithMask.mask.params.closed || customMaskPointIds.length === 0);

	useEffect(() => {
		if (!selectedMaskPointSelection) {
			return;
		}
		if (
			!selectedWithMask ||
			selectedWithMask.mask.type !== "custom" ||
			!isMaskSelectionForElement({
				trackId: selectedWithMask.trackId,
				elementId: selectedWithMask.elementId,
				maskId: selectedWithMask.mask.id,
				selection: selectedMaskPointSelection,
			})
		) {
			editor.selection.clearMaskPointSelection();
			return;
		}

		const availablePointIds = new Set(customMaskPointIds);
		const nextSelectedPointIds = selectedMaskPointSelection.pointIds.filter(
			(pointId) => availablePointIds.has(pointId),
		);
		if (
			nextSelectedPointIds.length === selectedMaskPointSelection.pointIds.length
		) {
			return;
		}
		if (nextSelectedPointIds.length === 0) {
			editor.selection.clearMaskPointSelection();
			return;
		}

		editor.selection.setSelectedMaskPoints({
			selection: {
				...selectedMaskPointSelection,
				pointIds: nextSelectedPointIds,
			},
		});
	}, [
		customMaskPointIds,
		editor.selection,
		selectedMaskPointSelection,
		selectedWithMask,
	]);

	const updateCustomMaskPointSelection = useCallback(
		({
			pointId,
			toggleSelection,
		}: {
			pointId: string;
			toggleSelection: boolean;
		}) => {
			if (!selectedWithMask || selectedWithMask.mask.type !== "custom") {
				return;
			}

			const isSelectionForCurrentMask = isMaskSelectionForElement({
				trackId: selectedWithMask.trackId,
				elementId: selectedWithMask.elementId,
				maskId: selectedWithMask.mask.id,
				selection: selectedMaskPointSelection,
			});
			const currentPointIds = isSelectionForCurrentMask
				? (selectedMaskPointSelection?.pointIds ?? [])
				: [];
			const nextPointIds = toggleSelection
				? currentPointIds.includes(pointId)
					? currentPointIds.filter(
							(currentPointId) => currentPointId !== pointId,
						)
					: [...currentPointIds, pointId]
				: [pointId];

			if (nextPointIds.length === 0) {
				editor.selection.clearMaskPointSelection();
				return;
			}

			editor.selection.setSelectedMaskPoints({
				selection: {
					trackId: selectedWithMask.trackId,
					elementId: selectedWithMask.elementId,
					maskId: selectedWithMask.mask.id,
					pointIds: nextPointIds,
				},
			});
		},
		[editor.selection, selectedMaskPointSelection, selectedWithMask],
	);

	const clearMaskHandleState = useCallback(() => {
		dragStateRef.current = null;
		pendingSegmentInsertRef.current = null;
		setActiveHandleId(null);
		onSnapLinesChange?.([]);
	}, [onSnapLinesChange]);

	const releaseCapturedPointer = useCallback(() => {
		const capture = captureRef.current;
		if (!capture) return;

		if (capture.element.hasPointerCapture(capture.pointerId)) {
			capture.element.releasePointerCapture(capture.pointerId);
		}

		captureRef.current = null;
	}, []);

	useEffect(() => {
		if (!activeHandleId) return;

		return registerCanceller({
			fn: () => {
				editor.timeline.discardPreview();
				clearMaskHandleState();
				releaseCapturedPointer();
			},
		});
	}, [
		activeHandleId,
		clearMaskHandleState,
		editor.timeline,
		releaseCapturedPointer,
	]);

	const handlePointerDown = useCallback(
		({ event, handleId }: { event: React.PointerEvent; handleId: string }) => {
			if (!selectedWithMask) return;
			if (event.button !== 0) return;
			event.stopPropagation();
			const parsedHandle =
				selectedWithMask.mask.type === "custom"
					? parseCustomMaskHandleId({ handleId })
					: null;
			const parsedSegmentHandle =
				selectedWithMask.mask.type === "custom"
					? parseCustomMaskSegmentHandleId({ handleId })
					: null;
			if (isCreatingCustomMask) {
				const firstPointId = customMaskPointIds[0];
				if (
					firstPointId &&
					handleId === `point:${firstPointId}:anchor` &&
					customMaskPointIds.length >= 3 &&
					selectedWithMask.mask.type === "custom"
				) {
					const updatedMask = withUpdatedMaskParams({
						mask: selectedWithMask.mask,
						params: {
							...selectedWithMask.mask.params,
							closed: true,
						},
					});
					editor.timeline.updateElements({
						updates: [
							{
								trackId: selectedWithMask.trackId,
								elementId: selectedWithMask.elementId,
								patch: {
									masks: replaceElementMask({
										masks: selectedWithMask.element.masks,
										updatedMask,
									}),
								} as Partial<MaskableElement>,
							},
						],
					});
				}
				return;
			}

			const pos = viewport.screenToCanvas({
				clientX: event.clientX,
				clientY: event.clientY,
			});
			if (!pos) return;

			if (parsedSegmentHandle && selectedWithMask.mask.type === "custom") {
				setActiveHandleId(handleId);
				pendingSegmentInsertRef.current = {
					trackId: selectedWithMask.trackId,
					elementId: selectedWithMask.elementId,
					maskId: selectedWithMask.mask.id,
					segmentIndex: parsedSegmentHandle.segmentIndex,
					startClientX: event.clientX,
					startClientY: event.clientY,
					startCanvasX: pos.x,
					startCanvasY: pos.y,
					startParams: { ...selectedWithMask.mask.params },
					bounds: selectedWithMask.bounds,
				};
				const captureTarget = event.currentTarget as HTMLElement;
				captureTarget.setPointerCapture(event.pointerId);
				captureRef.current = {
					element: captureTarget,
					pointerId: event.pointerId,
				};
				return;
			}

			if (parsedHandle?.part === "anchor") {
				updateCustomMaskPointSelection({
					pointId: parsedHandle.pointId,
					toggleSelection: event.shiftKey,
				});
				if (event.shiftKey) {
					return;
				}
			} else if (selectedWithMask.mask.type === "custom") {
				editor.selection.clearMaskPointSelection();
			}

			dragStateRef.current = {
				trackId: selectedWithMask.trackId,
				elementId: selectedWithMask.elementId,
				handleId,
				startCanvasX: pos.x,
				startCanvasY: pos.y,
				startParams: { ...selectedWithMask.mask.params },
			};
			setActiveHandleId(handleId);
			const captureTarget = event.currentTarget as HTMLElement;
			captureTarget.setPointerCapture(event.pointerId);
			captureRef.current = {
				element: captureTarget,
				pointerId: event.pointerId,
			};
		},
		[
			customMaskPointIds,
			editor.selection,
			editor.timeline,
			isCreatingCustomMask,
			selectedWithMask,
			updateCustomMaskPointSelection,
			viewport,
		],
	);

	const handleCanvasPointerDown = useCallback(
		({ event }: { event: React.PointerEvent }) => {
			if (!selectedWithMask || !isCreatingCustomMask) {
				return;
			}
			if (event.button !== 0) {
				return;
			}
			if (selectedWithMask.mask.type !== "custom") {
				return;
			}

			event.stopPropagation();
			const pos = viewport.screenToCanvas({
				clientX: event.clientX,
				clientY: event.clientY,
			});
			if (!pos) {
				return;
			}

			const nextParams = appendPointToCustomMask({
				params: selectedWithMask.mask.params,
				canvasPoint: pos,
				bounds: selectedWithMask.bounds,
			});
			const updatedMask = withUpdatedMaskParams({
				mask: selectedWithMask.mask,
				params: nextParams,
			});

			editor.timeline.updateElements({
				updates: [
					{
						trackId: selectedWithMask.trackId,
						elementId: selectedWithMask.elementId,
						patch: {
							masks: replaceElementMask({
								masks: selectedWithMask.element.masks,
								updatedMask,
							}),
						} as Partial<MaskableElement>,
					},
				],
			});
		},
		[editor.timeline, isCreatingCustomMask, selectedWithMask, viewport],
	);

	const handlePointerMove = useCallback(
		({ event }: { event: React.PointerEvent }) => {
			const pendingSegmentInsert = pendingSegmentInsertRef.current;
			if (pendingSegmentInsert && !dragStateRef.current) {
				const distance = Math.hypot(
					event.clientX - pendingSegmentInsert.startClientX,
					event.clientY - pendingSegmentInsert.startClientY,
				);
				if (distance >= SEGMENT_CLICK_DRAG_THRESHOLD_PX) {
					dragStateRef.current = {
						trackId: pendingSegmentInsert.trackId,
						elementId: pendingSegmentInsert.elementId,
						handleId: "position",
						startCanvasX: pendingSegmentInsert.startCanvasX,
						startCanvasY: pendingSegmentInsert.startCanvasY,
						startParams: pendingSegmentInsert.startParams,
					};
					pendingSegmentInsertRef.current = null;
					setActiveHandleId("position");
				}
			}

			const drag = dragStateRef.current;
			if (!drag || !selectedWithMask) return;

			const pos = viewport.screenToCanvas({
				clientX: event.clientX,
				clientY: event.clientY,
			});
			if (!pos) return;

			const deltaX = pos.x - drag.startCanvasX;
			const deltaY = pos.y - drag.startCanvasY;
			const def = masksRegistry.get(selectedWithMask.mask.type);

			const rawParams = def.computeParamUpdate({
				handleId: drag.handleId,
				startParams: drag.startParams,
				deltaX,
				deltaY,
				startCanvasX: drag.startCanvasX,
				startCanvasY: drag.startCanvasY,
				bounds: selectedWithMask.bounds,
				canvasSize,
			});
			const proposedParams = { ...drag.startParams, ...rawParams };

			const snapThreshold = viewport.screenPixelsToLogicalThreshold({
				screenPixels: SNAP_THRESHOLD_SCREEN_PIXELS,
			});
			const { params: nextParams, activeLines } = isShiftHeldRef.current
				? { params: proposedParams, activeLines: [] as SnapLine[] }
				: (def.interaction.snap?.({
						handleId: drag.handleId,
						startParams: drag.startParams,
						proposedParams,
						bounds: selectedWithMask.bounds,
						canvasSize,
						snapThreshold,
					}) ?? { params: proposedParams, activeLines: [] as SnapLine[] });

			onSnapLinesChange?.(activeLines);

			const updatedMask = withUpdatedMaskParams({
				mask: selectedWithMask.mask,
				params: nextParams as typeof selectedWithMask.mask.params,
			});
			editor.timeline.previewElements({
				updates: [
					{
						trackId: drag.trackId,
						elementId: drag.elementId,
						updates: {
							masks: replaceElementMask({
								masks: selectedWithMask.element.masks,
								updatedMask,
							}),
						} as Partial<MaskableElement>,
					},
				],
			});
		},
		[
			selectedWithMask,
			canvasSize,
			editor,
			isShiftHeldRef,
			onSnapLinesChange,
			viewport,
		],
	);

	const handlePointerUp = useCallback(() => {
		const pendingSegmentInsert = pendingSegmentInsertRef.current;
		if (pendingSegmentInsert && !dragStateRef.current) {
			editor.timeline.insertCustomMaskPoint({
				trackId: pendingSegmentInsert.trackId,
				elementId: pendingSegmentInsert.elementId,
				maskId: pendingSegmentInsert.maskId,
				segmentIndex: pendingSegmentInsert.segmentIndex,
				canvasPoint: {
					x: pendingSegmentInsert.startCanvasX,
					y: pendingSegmentInsert.startCanvasY,
				},
				bounds: pendingSegmentInsert.bounds,
			});
			clearMaskHandleState();
			releaseCapturedPointer();
			return;
		}

		if (dragStateRef.current) {
			editor.timeline.commitPreview();
			clearMaskHandleState();
		}
		releaseCapturedPointer();
	}, [clearMaskHandleState, editor, releaseCapturedPointer]);

	return {
		selectedWithMask,
		handlePositions,
		overlays,
		isCreatingCustomMask,
		handleCanvasPointerDown,
		activeHandleId,
		handlePointerDown,
		handlePointerMove,
		handlePointerUp,
	};
}

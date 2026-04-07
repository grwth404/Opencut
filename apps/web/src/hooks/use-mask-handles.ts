import { useCallback, useEffect, useRef, useState } from "react";
import { usePreviewViewport } from "@/components/editor/panels/preview/preview-viewport";
import { useEditor } from "@/hooks/use-editor";
import { useShiftKey } from "@/hooks/use-shift-key";
import { masksRegistry } from "@/lib/masks";
import {
	getMaskHandlePositions,
	getLineMaskLinePoints,
} from "@/lib/masks/handle-positions";
import { snapMaskInteraction } from "@/lib/masks/snap";
import { getVisibleElementsWithBounds } from "@/lib/preview/element-bounds";
import {
	SNAP_THRESHOLD_SCREEN_PIXELS,
	type SnapLine,
} from "@/lib/preview/preview-snap";
import type { ParamValues } from "@/lib/params";
import type {
	BaseMaskParams,
	MaskHandlePosition,
	MaskLinePoints,
} from "@/lib/masks/types";
import type { MaskableElement } from "@/lib/timeline";
import { registerCanceller } from "@/lib/cancel-interaction";

interface DragState {
	trackId: string;
	elementId: string;
	handleId: string;
	startCanvasX: number;
	startCanvasY: number;
	startParams: BaseMaskParams & ParamValues;
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
					if (!element.masks?.length) return null;
					return { ...entry, element, mask: element.masks[0] };
				})()
			: null;

	const handlePositions: MaskHandlePosition[] = selectedWithMask
		? (() => {
				const def = masksRegistry.get(selectedWithMask.mask.type);
				const { x: scaleX, y: scaleY } = viewport.getDisplayScale();
				const displayScale = (scaleX + scaleY) / 2;
				return getMaskHandlePositions({
					overlayShape: def.overlayShape,
					features: def.features,
					params: selectedWithMask.mask.params,
					bounds: selectedWithMask.bounds,
					displayScale,
				});
			})()
		: [];

	const linePoints: MaskLinePoints | null =
		selectedWithMask?.mask.type === "split"
			? getLineMaskLinePoints({
					centerX: selectedWithMask.mask.params.centerX,
					centerY: selectedWithMask.mask.params.centerY,
					rotation: selectedWithMask.mask.params.rotation,
					bounds: selectedWithMask.bounds,
				})
			: null;

	const clearMaskHandleState = useCallback(() => {
		dragStateRef.current = null;
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
			event.stopPropagation();

			const pos = viewport.screenToCanvas({
				clientX: event.clientX,
				clientY: event.clientY,
			});
			if (!pos) return;

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
		[selectedWithMask, viewport],
	);

	const handlePointerMove = useCallback(
		({ event }: { event: React.PointerEvent }) => {
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
				: snapMaskInteraction({
						handleId: drag.handleId,
						startParams: drag.startParams,
						proposedParams,
						bounds: selectedWithMask.bounds,
						canvasSize,
						snapThreshold,
					});

			onSnapLinesChange?.(activeLines);

			const updatedMask = {
				...selectedWithMask.mask,
				params: nextParams,
			};
			editor.timeline.previewElements({
				updates: [
					{
						trackId: drag.trackId,
						elementId: drag.elementId,
						updates: {
							masks: [
								updatedMask,
								...(selectedWithMask.element.masks?.slice(1) ?? []),
							],
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
			if (dragStateRef.current) {
				editor.timeline.commitPreview();
				clearMaskHandleState();
			}
			releaseCapturedPointer();
		},
		[clearMaskHandleState, editor, releaseCapturedPointer],
	);

	return {
		selectedWithMask,
		handlePositions,
		linePoints,
		activeHandleId,
		handlePointerDown,
		handlePointerMove,
		handlePointerUp,
	};
}

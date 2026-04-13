import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { useShiftKey } from "@/hooks/use-shift-key";
import { usePreviewViewport } from "@/components/editor/panels/preview/preview-viewport";
import type { Transform } from "@/lib/rendering";
import type { ElementRef, TextElement } from "@/lib/timeline";
import {
	getVisibleElementsWithBounds,
	type ElementWithBounds,
} from "@/lib/preview/element-bounds";
import {
	getHitElements,
	hitTest,
	resolvePreferredHit,
} from "@/lib/preview/hit-test";
import { isVisualElement } from "@/lib/timeline/element-utils";
import {
	SNAP_THRESHOLD_SCREEN_PIXELS,
	snapPosition,
	type SnapLine,
} from "@/lib/preview/preview-snap";
import { registerCanceller } from "@/lib/cancel-interaction";

export type OnSnapLinesChange = (lines: SnapLine[]) => void;

const MIN_DRAG_DISTANCE = 0.5;

interface CapturedPointerState {
	pointerId: number;
	captureTarget: HTMLElement;
}

interface PendingGestureState extends CapturedPointerState {
	startX: number;
	startY: number;
	topmostHit: ElementWithBounds | null;
	selectedHit: ElementWithBounds | null;
	selectedElements: ElementRef[];
}

interface DragState extends CapturedPointerState {
	startX: number;
	startY: number;
	bounds: {
		width: number;
		height: number;
		rotation: number;
	};
	elements: Array<{
		trackId: string;
		elementId: string;
		initialTransform: Transform;
	}>;
}

function isSameElementRef({
	left,
	right,
}: {
	left: ElementRef;
	right: ElementRef;
}): boolean {
	return left.trackId === right.trackId && left.elementId === right.elementId;
}

function buildDragSelection({
	selectedElements,
	dragTarget,
}: {
	selectedElements: ElementRef[];
	dragTarget: ElementWithBounds;
}): ElementRef[] {
	const dragTargetRef = {
		trackId: dragTarget.trackId,
		elementId: dragTarget.elementId,
	};

	if (
		!selectedElements.some((selectedElement) =>
			isSameElementRef({ left: selectedElement, right: dragTargetRef }),
		)
	) {
		return [dragTargetRef];
	}

	return [
		dragTargetRef,
		...selectedElements.filter(
			(selectedElement) =>
				!isSameElementRef({ left: selectedElement, right: dragTargetRef }),
		),
	];
}

export function usePreviewInteraction({
	onSnapLinesChange,
	isMaskMode = false,
}: {
	onSnapLinesChange?: OnSnapLinesChange;
	isMaskMode?: boolean;
}) {
	const editor = useEditor();
	const isShiftHeldRef = useShiftKey();
	const viewport = usePreviewViewport();
	const [isDragging, setIsDragging] = useState(false);
	const [editingText, setEditingText] = useState<{
		trackId: string;
		elementId: string;
		element: TextElement;
		originalOpacity: number;
	} | null>(null);
	const dragStateRef = useRef<DragState | null>(null);
	const pendingGestureRef = useRef<PendingGestureState | null>(null);
	const wasPlayingRef = useRef(editor.playback.getIsPlaying());
	const editingTextRef = useRef(editingText);
	editingTextRef.current = editingText;

	const releaseCapturedPointer = useCallback(
		(pointerState: CapturedPointerState | null) => {
			if (!pointerState) return;

			if (
				!pointerState.captureTarget.hasPointerCapture(pointerState.pointerId)
			) {
				return;
			}

			pointerState.captureTarget.releasePointerCapture(pointerState.pointerId);
		},
		[],
	);

	const commitTextEdit = useCallback(() => {
		const current = editingTextRef.current;
		if (!current) return;
		editingTextRef.current = null;
		editor.timeline.commitPreview();
		setEditingText(null);
	}, [editor.timeline]);

	useEffect(() => {
		const unsubscribe = editor.playback.subscribe(() => {
			const isPlaying = editor.playback.getIsPlaying();
			if (isPlaying && !wasPlayingRef.current && editingTextRef.current) {
				commitTextEdit();
			}
			wasPlayingRef.current = isPlaying;
		});
		return unsubscribe;
	}, [editor.playback, commitTextEdit]);

	useEffect(() => {
		if (!isDragging) return;

		return registerCanceller({
			fn: () => {
				const dragState = dragStateRef.current;
				if (!dragState) return;

				editor.timeline.discardPreview();
				dragStateRef.current = null;
				pendingGestureRef.current = null;
				setIsDragging(false);
				onSnapLinesChange?.([]);
				releaseCapturedPointer(dragState);
			},
		});
	}, [editor.timeline, isDragging, onSnapLinesChange, releaseCapturedPointer]);

	const handleDoubleClick = useCallback(
		({ clientX, clientY }: React.MouseEvent) => {
			if (editingText || isMaskMode) return;

			const tracks = editor.scenes.getActiveScene().tracks;
			const currentTime = editor.playback.getCurrentTime();
			const mediaAssets = editor.media.getAssets();
			const canvasSize = editor.project.getActive().settings.canvasSize;

			const startPos = viewport.screenToCanvas({
				clientX,
				clientY,
			});
			if (!startPos) return;

			const elementsWithBounds = getVisibleElementsWithBounds({
				tracks,
				currentTime,
				canvasSize,
				mediaAssets,
			});

			const hit = hitTest({
				canvasX: startPos.x,
				canvasY: startPos.y,
				elementsWithBounds,
			});

			if (!hit || hit.element.type !== "text") return;

			const textElement = hit.element as TextElement;
			setEditingText({
				trackId: hit.trackId,
				elementId: hit.elementId,
				element: textElement,
				originalOpacity: textElement.opacity,
			});
		},
		[editor, editingText, isMaskMode, viewport],
	);

	const handlePointerDown = useCallback(
		({
			clientX,
			clientY,
			currentTarget,
			pointerId,
			button,
		}: React.PointerEvent) => {
			if (editingText) return;
			if (isMaskMode) return;
			if (button !== 0) return;

			const tracks = editor.scenes.getActiveScene().tracks;
			const currentTime = editor.playback.getCurrentTime();
			const mediaAssets = editor.media.getAssets();
			const canvasSize = editor.project.getActive().settings.canvasSize;

			const startPos = viewport.screenToCanvas({
				clientX,
				clientY,
			});
			if (!startPos) return;

			const elementsWithBounds = getVisibleElementsWithBounds({
				tracks,
				currentTime,
				canvasSize,
				mediaAssets,
			});

			const hits = getHitElements({
				canvasX: startPos.x,
				canvasY: startPos.y,
				elementsWithBounds,
			});
			const selectedElements = editor.selection.getSelectedElements();
			const topmostHit = hits[0] ?? null;

			pendingGestureRef.current = {
				startX: startPos.x,
				startY: startPos.y,
				pointerId,
				captureTarget: currentTarget as HTMLElement,
				topmostHit,
				selectedHit: resolvePreferredHit({
					hits,
					preferredElements: selectedElements,
				}),
				selectedElements,
			};
			currentTarget.setPointerCapture(pointerId);
		},
		[editor, editingText, isMaskMode, viewport],
	);

	const handlePointerMove = useCallback(
		({ clientX, clientY }: React.PointerEvent) => {
			const canvasSize = editor.project.getActive().settings.canvasSize;

			const currentPos = viewport.screenToCanvas({
				clientX,
				clientY,
			});
			if (!currentPos) return;

			let dragState = dragStateRef.current;

			if (!dragState) {
				const pendingGesture = pendingGestureRef.current;
				if (!pendingGesture) return;

				const deltaX = currentPos.x - pendingGesture.startX;
				const deltaY = currentPos.y - pendingGesture.startY;
				const hasMovement =
					Math.abs(deltaX) > MIN_DRAG_DISTANCE ||
					Math.abs(deltaY) > MIN_DRAG_DISTANCE;

				if (!hasMovement) {
					onSnapLinesChange?.([]);
					return;
				}

				const dragTarget = pendingGesture.selectedHit ?? pendingGesture.topmostHit;
				if (!dragTarget) {
					pendingGestureRef.current = null;
					onSnapLinesChange?.([]);
					releaseCapturedPointer(pendingGesture);
					return;
				}

				const dragSelection = buildDragSelection({
					selectedElements: pendingGesture.selectedElements,
					dragTarget,
				});
				const elementsWithTracks = editor.timeline.getElementsWithTracks({
					elements: dragSelection,
				});
				const draggableElements = elementsWithTracks.filter(({ element }) =>
					isVisualElement(element),
				);

				if (draggableElements.length === 0) {
					pendingGestureRef.current = null;
					onSnapLinesChange?.([]);
					releaseCapturedPointer(pendingGesture);
					return;
				}

			if (pendingGesture.selectedHit === null) {
				editor.selection.setSelectedElements({
					elements: [
						{
							trackId: dragTarget.trackId,
							elementId: dragTarget.elementId,
						},
					],
				});
			}

				dragState = {
					startX: pendingGesture.startX,
					startY: pendingGesture.startY,
					pointerId: pendingGesture.pointerId,
					captureTarget: pendingGesture.captureTarget,
					bounds: {
						width: dragTarget.bounds.width,
						height: dragTarget.bounds.height,
						rotation: dragTarget.bounds.rotation,
					},
					elements: draggableElements.map(({ track, element }) => ({
						trackId: track.id,
						elementId: element.id,
						initialTransform: (element as { transform: Transform }).transform,
					})),
				};
				dragStateRef.current = dragState;
				pendingGestureRef.current = null;
				setIsDragging(true);
			}

			const deltaX = currentPos.x - dragState.startX;
			const deltaY = currentPos.y - dragState.startY;
			const firstElement = dragState.elements[0];
			const proposedPosition = {
				x: firstElement.initialTransform.position.x + deltaX,
				y: firstElement.initialTransform.position.y + deltaY,
			};

			const shouldSnap = !isShiftHeldRef.current;
			const snapThreshold = viewport.screenPixelsToLogicalThreshold({
				screenPixels: SNAP_THRESHOLD_SCREEN_PIXELS,
			});
			const { snappedPosition, activeLines } = shouldSnap
				? snapPosition({
						proposedPosition,
						canvasSize,
						elementSize: dragState.bounds,
						rotation: dragState.bounds.rotation,
						snapThreshold,
					})
				: {
						snappedPosition: proposedPosition,
						activeLines: [] as SnapLine[],
					};

			onSnapLinesChange?.(activeLines);

			const deltaSnappedX =
				snappedPosition.x - firstElement.initialTransform.position.x;
			const deltaSnappedY =
				snappedPosition.y - firstElement.initialTransform.position.y;

			const updates = dragState.elements.map(
				({ trackId, elementId, initialTransform }) => ({
					trackId,
					elementId,
					updates: {
						transform: {
							...initialTransform,
							position: {
								x: initialTransform.position.x + deltaSnappedX,
								y: initialTransform.position.y + deltaSnappedY,
							},
						},
					},
				}),
			);

			editor.timeline.previewElements({ updates });
		},
		[editor, isShiftHeldRef, onSnapLinesChange, releaseCapturedPointer, viewport],
	);

	const handlePointerUp = useCallback(
		({ type }: React.PointerEvent) => {
			const dragState = dragStateRef.current;
			if (dragState) {
				if (type === "pointercancel") {
					editor.timeline.discardPreview();
				} else {
					editor.timeline.commitPreview();
				}

				dragStateRef.current = null;
				pendingGestureRef.current = null;
				setIsDragging(false);
				onSnapLinesChange?.([]);
				releaseCapturedPointer(dragState);
				return;
			}

			const pendingGesture = pendingGestureRef.current;
			if (!pendingGesture) return;

			if (type !== "pointercancel") {
				const clickTarget = pendingGesture.topmostHit;
				if (!clickTarget) {
					editor.selection.clearSelection();
				} else {
					editor.selection.setSelectedElements({
						elements: [
							{
								trackId: clickTarget.trackId,
								elementId: clickTarget.elementId,
							},
						],
					});
				}
			}

			pendingGestureRef.current = null;
			onSnapLinesChange?.([]);
			releaseCapturedPointer(pendingGesture);
		},
		[editor, onSnapLinesChange, releaseCapturedPointer],
	);

	return {
		onPointerDown: handlePointerDown,
		onPointerMove: handlePointerMove,
		onPointerUp: handlePointerUp,
		onDoubleClick: handleDoubleClick,
		editingText,
		commitTextEdit,
	};
}

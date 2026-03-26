import { useCallback, useEffect, useRef, useState } from "react";
import { usePreviewViewport } from "@/components/editor/panels/preview/preview-viewport";
import type { OnSnapLinesChange } from "@/hooks/use-preview-interaction";
import { useEditor } from "@/hooks/use-editor";
import { useShiftKey } from "@/hooks/use-shift-key";
import {
	getVisibleElementsWithBounds,
	type ElementWithBounds,
} from "@/lib/preview/element-bounds";
import {
	MIN_SCALE,
	SNAP_THRESHOLD_SCREEN_PIXELS,
	snapRotation,
	snapScale,
	snapScaleAxes,
	type ScaleEdgePreference,
	type SnapLine,
} from "@/lib/preview/preview-snap";
import { isVisualElement } from "@/lib/timeline/element-utils";
import {
	getElementLocalTime,
	resolveTransformAtTime,
	setChannel,
} from "@/lib/animation";
import type { Transform } from "@/lib/rendering";
import type { ElementAnimations } from "@/lib/animation/types";
import { registerCanceller } from "@/lib/cancel-interaction";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type Edge = "right" | "left" | "bottom";
type HandleType = Corner | Edge | "rotation";

function getPreferredEdge({
	edge,
}: {
	edge: Edge;
}): ScaleEdgePreference {
	return edge === "right"
		? { right: true }
		: edge === "left"
			? { left: true }
			: { bottom: true };
}

interface ScaleState {
	trackId: string;
	elementId: string;
	initialTransform: Transform;
	initialDistance: number;
	initialBoundsCx: number;
	initialBoundsCy: number;
	baseWidth: number;
	baseHeight: number;
	shouldClearScaleAnimation: boolean;
	animationsWithoutScale: ElementAnimations | undefined;
}

interface RotationState {
	trackId: string;
	elementId: string;
	initialTransform: Transform;
	initialAngle: number;
	initialBoundsCx: number;
	initialBoundsCy: number;
}

interface EdgeScaleState {
	trackId: string;
	elementId: string;
	initialTransform: Transform;
	initialBoundsCx: number;
	initialBoundsCy: number;
	baseWidth: number;
	baseHeight: number;
	edge: Edge;
	rotationRad: number;
	shouldClearScaleAnimation: boolean;
	animationsWithoutScale: ElementAnimations | undefined;
}

function clampScaleNonZero(scale: number): number {
	if (Math.abs(scale) < MIN_SCALE) {
		return scale < 0 ? -MIN_SCALE : MIN_SCALE;
	}
	return scale;
}

function getCornerDistance({
	bounds,
	corner,
}: {
	bounds: {
		cx: number;
		cy: number;
		width: number;
		height: number;
		rotation: number;
	};
	corner: Corner;
}): number {
	const halfWidth = bounds.width / 2;
	const halfHeight = bounds.height / 2;
	const angleRad = (bounds.rotation * Math.PI) / 180;
	const cos = Math.cos(angleRad);
	const sin = Math.sin(angleRad);

	const localX =
		corner === "top-left" || corner === "bottom-left" ? -halfWidth : halfWidth;
	const localY =
		corner === "top-left" || corner === "top-right" ? -halfHeight : halfHeight;

	const rotatedX = localX * cos - localY * sin;
	const rotatedY = localX * sin + localY * cos;
	return Math.sqrt(rotatedX * rotatedX + rotatedY * rotatedY) || 1;
}

export function useTransformHandles({
	onSnapLinesChange,
}: {
	onSnapLinesChange?: OnSnapLinesChange;
}) {
	const editor = useEditor();
	const isShiftHeldRef = useShiftKey();
	const viewport = usePreviewViewport();
	const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
	const scaleStateRef = useRef<ScaleState | null>(null);
	const rotationStateRef = useRef<RotationState | null>(null);
	const edgeScaleStateRef = useRef<EdgeScaleState | null>(null);
	const captureRef = useRef<{ element: HTMLElement; pointerId: number } | null>(
		null,
	);

	const selectedElements = useEditor((e) => e.selection.getSelectedElements());
	const tracks = useEditor((e) => e.timeline.getRenderTracks());
	const currentTime = useEditor((e) => e.playback.getCurrentTime());
	const currentTimeRef = useRef(currentTime);
	currentTimeRef.current = currentTime;
	const mediaAssets = useEditor((e) => e.media.getAssets());
	const canvasSize = useEditor(
		(e) => e.project.getActive().settings.canvasSize,
	);

	const elementsWithBounds = getVisibleElementsWithBounds({
		tracks,
		currentTime,
		canvasSize,
		mediaAssets,
	});

	const selectedWithBounds: ElementWithBounds | null =
		selectedElements.length === 1
			? (elementsWithBounds.find(
					(entry) =>
						entry.trackId === selectedElements[0].trackId &&
						entry.elementId === selectedElements[0].elementId,
				) ?? null)
			: null;

	const hasVisualSelection =
		selectedWithBounds !== null && isVisualElement(selectedWithBounds.element);

	const clearActiveHandleState = useCallback(() => {
		scaleStateRef.current = null;
		rotationStateRef.current = null;
		edgeScaleStateRef.current = null;
		setActiveHandle(null);
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
		if (!activeHandle) return;

		return registerCanceller({
			fn: () => {
				editor.timeline.discardPreview();
				clearActiveHandleState();
				releaseCapturedPointer();
			},
		});
	}, [activeHandle, clearActiveHandleState, editor.timeline, releaseCapturedPointer]);

	const handleCornerPointerDown = useCallback(
		({ event, corner }: { event: React.PointerEvent; corner: Corner }) => {
			if (!selectedWithBounds) return;
			event.stopPropagation();

			const { bounds, trackId, elementId, element } = selectedWithBounds;
			if (!isVisualElement(element)) return;

			const localTime = getElementLocalTime({
				timelineTime: currentTimeRef.current,
				elementStartTime: element.startTime,
				elementDuration: element.duration,
			});
			const resolvedTransform = resolveTransformAtTime({
				baseTransform: element.transform,
				animations: element.animations,
				localTime,
			});

			const initialDistance = getCornerDistance({ bounds, corner });
			const baseWidth = bounds.width / resolvedTransform.scaleX;
			const baseHeight = bounds.height / resolvedTransform.scaleY;
			const shouldClearScaleAnimation =
				!!element.animations?.channels["transform.scaleX"] ||
				!!element.animations?.channels["transform.scaleY"];
			const animationsWithoutScale = shouldClearScaleAnimation
				? setChannel({
						animations: setChannel({
							animations: element.animations,
							propertyPath: "transform.scaleX",
							channel: undefined,
						}),
						propertyPath: "transform.scaleY",
						channel: undefined,
					})
				: element.animations;

			scaleStateRef.current = {
				trackId,
				elementId,
				initialTransform: resolvedTransform,
				initialDistance,
				initialBoundsCx: bounds.cx,
				initialBoundsCy: bounds.cy,
				baseWidth,
				baseHeight,
				shouldClearScaleAnimation,
				animationsWithoutScale,
			};
			setActiveHandle(corner);
			const captureTarget = event.currentTarget as HTMLElement;
			captureTarget.setPointerCapture(event.pointerId);
			captureRef.current = {
				element: captureTarget,
				pointerId: event.pointerId,
			};
		},
		[selectedWithBounds],
	);

	const handleRotationPointerDown = useCallback(
		({ event }: { event: React.PointerEvent }) => {
			if (!selectedWithBounds) return;
			event.stopPropagation();

			const { bounds, trackId, elementId, element } = selectedWithBounds;
			if (!isVisualElement(element)) return;

			const localTime = getElementLocalTime({
				timelineTime: currentTimeRef.current,
				elementStartTime: element.startTime,
				elementDuration: element.duration,
			});
			const resolvedTransform = resolveTransformAtTime({
				baseTransform: element.transform,
				animations: element.animations,
				localTime,
			});

			const position = viewport.screenToCanvas({
				clientX: event.clientX,
				clientY: event.clientY,
			});
			if (!position) return;
			const deltaX = position.x - bounds.cx;
			const deltaY = position.y - bounds.cy;
			const initialAngle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

			rotationStateRef.current = {
				trackId,
				elementId,
				initialTransform: resolvedTransform,
				initialAngle,
				initialBoundsCx: bounds.cx,
				initialBoundsCy: bounds.cy,
			};
			setActiveHandle("rotation");
			const captureTarget = event.currentTarget as HTMLElement;
			captureTarget.setPointerCapture(event.pointerId);
			captureRef.current = {
				element: captureTarget,
				pointerId: event.pointerId,
			};
		},
		[selectedWithBounds, viewport],
	);

	const handleEdgePointerDown = useCallback(
		({ event, edge }: { event: React.PointerEvent; edge: Edge }) => {
			if (!selectedWithBounds) return;
			event.stopPropagation();

			const { bounds, trackId, elementId, element } = selectedWithBounds;
			if (!isVisualElement(element)) return;

			const localTime = getElementLocalTime({
				timelineTime: currentTimeRef.current,
				elementStartTime: element.startTime,
				elementDuration: element.duration,
			});
			const resolvedTransform = resolveTransformAtTime({
				baseTransform: element.transform,
				animations: element.animations,
				localTime,
			});

			const baseWidth = bounds.width / resolvedTransform.scaleX;
			const baseHeight = bounds.height / resolvedTransform.scaleY;
			const rotationRad = (bounds.rotation * Math.PI) / 180;

			const propertyPath =
				edge === "right" || edge === "left"
					? "transform.scaleX"
					: "transform.scaleY";
			const shouldClearScaleAnimation =
				!!element.animations?.channels[propertyPath];
			const animationsWithoutScale = shouldClearScaleAnimation
				? setChannel({
						animations: element.animations,
						propertyPath,
						channel: undefined,
					})
				: element.animations;

			edgeScaleStateRef.current = {
				trackId,
				elementId,
				initialTransform: resolvedTransform,
				initialBoundsCx: bounds.cx,
				initialBoundsCy: bounds.cy,
				baseWidth,
				baseHeight,
				edge,
				rotationRad,
				shouldClearScaleAnimation,
				animationsWithoutScale,
			};
			setActiveHandle(edge);
			const captureTarget = event.currentTarget as HTMLElement;
			captureTarget.setPointerCapture(event.pointerId);
			captureRef.current = {
				element: captureTarget,
				pointerId: event.pointerId,
			};
		},
		[selectedWithBounds],
	);

	const handlePointerMove = useCallback(
		({ event }: { event: React.PointerEvent }) => {
			if (
				!scaleStateRef.current &&
				!rotationStateRef.current &&
				!edgeScaleStateRef.current
			)
				return;

			const position = viewport.screenToCanvas({
				clientX: event.clientX,
				clientY: event.clientY,
			});
			if (!position) return;

			if (
				scaleStateRef.current &&
				activeHandle &&
				activeHandle !== "rotation"
			) {
				const {
					trackId,
					elementId,
					initialTransform,
					initialDistance,
					initialBoundsCx,
					initialBoundsCy,
					baseWidth,
					baseHeight,
					shouldClearScaleAnimation,
					animationsWithoutScale,
				} = scaleStateRef.current;

				const deltaX = position.x - initialBoundsCx;
				const deltaY = position.y - initialBoundsCy;
				const currentDistance =
					Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
				const scaleFactor = currentDistance / initialDistance;

				// Use actual element dimensions (base * current scale) so snap
				// computes the correct edges when scaleX ≠ scaleY
				const effectiveWidth = baseWidth * initialTransform.scaleX;
				const effectiveHeight = baseHeight * initialTransform.scaleY;

				const snapThreshold = viewport.screenPixelsToLogicalThreshold({
					screenPixels: SNAP_THRESHOLD_SCREEN_PIXELS,
				});
				const { snappedScale: snappedFactor, activeLines } =
					isShiftHeldRef.current
						? { snappedScale: scaleFactor, activeLines: [] as SnapLine[] }
						: snapScale({
								proposedScale: scaleFactor,
								position: initialTransform.position,
								baseWidth: effectiveWidth,
								baseHeight: effectiveHeight,
								rotation: initialTransform.rotate,
								canvasSize,
								snapThreshold,
							});

				onSnapLinesChange?.(activeLines);

				editor.timeline.previewElements({
					updates: [
						{
							trackId,
							elementId,
							updates: {
								transform: {
									...initialTransform,
									scaleX: clampScaleNonZero(
										initialTransform.scaleX * snappedFactor,
									),
									scaleY: clampScaleNonZero(
										initialTransform.scaleY * snappedFactor,
									),
								},
								...(shouldClearScaleAnimation && {
									animations: animationsWithoutScale,
								}),
							},
						},
					],
				});
				return;
			}

			if (
				edgeScaleStateRef.current &&
				(activeHandle === "right" ||
					activeHandle === "left" ||
					activeHandle === "bottom")
			) {
				const {
					trackId,
					elementId,
					initialTransform,
					initialBoundsCx,
					initialBoundsCy,
					baseWidth,
					baseHeight,
					edge,
					rotationRad,
					shouldClearScaleAnimation,
					animationsWithoutScale,
				} = edgeScaleStateRef.current;

				const deltaX = position.x - initialBoundsCx;
				const deltaY = position.y - initialBoundsCy;
				const xProjection =
					deltaX * Math.cos(rotationRad) + deltaY * Math.sin(rotationRad);
				const yProjection =
					-deltaX * Math.sin(rotationRad) + deltaY * Math.cos(rotationRad);
				const projection =
					edge === "right"
						? xProjection
						: edge === "left"
							? -xProjection
							: yProjection;

				const baseAxisHalf =
					edge === "right" || edge === "left" ? baseWidth / 2 : baseHeight / 2;
				const proposedScale = clampScaleNonZero(projection / baseAxisHalf);

				const proposedScaleX =
					edge === "right" || edge === "left"
						? proposedScale
						: initialTransform.scaleX;
				const proposedScaleY =
					edge === "bottom" ? proposedScale : initialTransform.scaleY;

				const snapThreshold = viewport.screenPixelsToLogicalThreshold({
					screenPixels: SNAP_THRESHOLD_SCREEN_PIXELS,
				});
				const { x: xSnap, y: ySnap } = isShiftHeldRef.current
					? {
							x: {
								snappedScale: proposedScaleX,
								snapDistance: Infinity,
								activeLines: [] as SnapLine[],
							},
							y: {
								snappedScale: proposedScaleY,
								snapDistance: Infinity,
								activeLines: [] as SnapLine[],
							},
						}
					: snapScaleAxes({
							proposedScaleX,
							proposedScaleY,
							position: initialTransform.position,
							baseWidth,
							baseHeight,
							rotation: initialTransform.rotate,
							canvasSize,
							snapThreshold,
							preferredEdges: getPreferredEdge({ edge }),
						});

				const relevantSnap =
					edge === "right" || edge === "left" ? xSnap : ySnap;
				onSnapLinesChange?.(relevantSnap.activeLines);

				editor.timeline.previewElements({
					updates: [
						{
							trackId,
							elementId,
							updates: {
								transform: {
									...initialTransform,
									scaleX:
										edge === "right" || edge === "left"
											? xSnap.snappedScale
											: initialTransform.scaleX,
									scaleY:
										edge === "bottom"
											? ySnap.snappedScale
											: initialTransform.scaleY,
								},
								...(shouldClearScaleAnimation && {
									animations: animationsWithoutScale,
								}),
							},
						},
					],
				});
				return;
			}

			if (rotationStateRef.current && activeHandle === "rotation") {
				const {
					trackId,
					elementId,
					initialTransform,
					initialAngle,
					initialBoundsCx,
					initialBoundsCy,
				} = rotationStateRef.current;

				const deltaX = position.x - initialBoundsCx;
				const deltaY = position.y - initialBoundsCy;
				const currentAngle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
				let deltaAngle = currentAngle - initialAngle;
				if (deltaAngle > 180) deltaAngle -= 360;
				if (deltaAngle < -180) deltaAngle += 360;
				const newRotate = initialTransform.rotate + deltaAngle;
				const { snappedRotation } = isShiftHeldRef.current
					? { snappedRotation: newRotate }
					: snapRotation({ proposedRotation: newRotate });

				editor.timeline.previewElements({
					updates: [
						{
							trackId,
							elementId,
							updates: {
								transform: { ...initialTransform, rotate: snappedRotation },
							},
						},
					],
				});
			}
		},
		[
			activeHandle,
			canvasSize,
			editor,
			isShiftHeldRef,
			onSnapLinesChange,
			viewport,
		],
	);

	const handlePointerUp = useCallback(() => {
			if (
				scaleStateRef.current ||
				rotationStateRef.current ||
				edgeScaleStateRef.current
			) {
				editor.timeline.commitPreview();
				clearActiveHandleState();
			}
			releaseCapturedPointer();
		},
		[clearActiveHandleState, editor, releaseCapturedPointer],
	);

	return {
		selectedWithBounds,
		hasVisualSelection,
		activeHandle,
		handleCornerPointerDown,
		handleEdgePointerDown,
		handleRotationPointerDown,
		handlePointerMove,
		handlePointerUp,
	};
}

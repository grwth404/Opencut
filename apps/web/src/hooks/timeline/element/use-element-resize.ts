import { useState, useEffect, useRef, useCallback } from "react";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { snapTimeToFrame } from "opencut-wasm";
import type { TimelineElement, TimelineTrack } from "@/lib/timeline";
import { useEditor } from "@/hooks/use-editor";
import { useShiftKey } from "@/hooks/use-shift-key";
import {
	findSnapPoints,
	snapToNearestPoint,
	type SnapPoint,
} from "@/lib/timeline/snap-utils";
import { isRetimableElement } from "@/lib/timeline";
import {
	getSourceSpanAtClipTime,
	getTimelineDurationForSourceSpan,
} from "@/lib/retime";
import { useTimelineStore } from "@/stores/timeline-store";
import { registerCanceller } from "@/lib/cancel-interaction";

export interface ResizeState {
	elementId: string;
	side: "left" | "right";
	startX: number;
	initialTrimStart: number;
	initialTrimEnd: number;
	initialStartTime: number;
	initialDuration: number;
}

interface UseTimelineElementResizeProps {
	element: TimelineElement;
	track: TimelineTrack;
	zoomLevel: number;
	onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
	onResizeStateChange?: (params: { isResizing: boolean }) => void;
}

export function useTimelineElementResize({
	element,
	track,
	zoomLevel,
	onSnapPointChange,
	onResizeStateChange,
}: UseTimelineElementResizeProps) {
	const editor = useEditor();
	const isShiftHeldRef = useShiftKey();
	const snappingEnabled = useTimelineStore((state) => state.snappingEnabled);
	const rippleEditingEnabled = useTimelineStore(
		(state) => state.rippleEditingEnabled,
	);

	const [resizing, setResizing] = useState<ResizeState | null>(null);
	const [currentTrimStart, setCurrentTrimStart] = useState(element.trimStart);
	const [currentTrimEnd, setCurrentTrimEnd] = useState(element.trimEnd);
	const [currentStartTime, setCurrentStartTime] = useState(element.startTime);
	const [currentDuration, setCurrentDuration] = useState(element.duration);
	const currentTrimStartRef = useRef(element.trimStart);
	const currentTrimEndRef = useRef(element.trimEnd);
	const currentStartTimeRef = useRef(element.startTime);
	const currentDurationRef = useRef(element.duration);

	const handleResizeStart = ({
		event,
		elementId,
		side,
	}: {
		event: React.MouseEvent;
		elementId: string;
		side: "left" | "right";
	}) => {
		event.stopPropagation();
		event.preventDefault();

		setResizing({
			elementId,
			side,
			startX: event.clientX,
			initialTrimStart: element.trimStart,
			initialTrimEnd: element.trimEnd,
			initialStartTime: element.startTime,
			initialDuration: element.duration,
		});

		setCurrentTrimStart(element.trimStart);
		setCurrentTrimEnd(element.trimEnd);
		setCurrentStartTime(element.startTime);
		setCurrentDuration(element.duration);
		currentTrimStartRef.current = element.trimStart;
		currentTrimEndRef.current = element.trimEnd;
		currentStartTimeRef.current = element.startTime;
		currentDurationRef.current = element.duration;
		onResizeStateChange?.({ isResizing: true });
	};

	const canExtendElementDuration = useCallback(() => {
		return element.sourceDuration == null;
	}, [element.sourceDuration]);

	const getSourceDeltaForClipDelta = useCallback(
		(clipDelta: number) => {
			if (!isRetimableElement(element)) {
				return clipDelta;
			}

			return clipDelta >= 0
				? getSourceSpanAtClipTime({
						clipTime: clipDelta,
						retime: element.retime,
					})
				: -getSourceSpanAtClipTime({
						clipTime: Math.abs(clipDelta),
						retime: element.retime,
					});
		},
		[element],
	);

	const getVisibleSourceSpanForDuration = useCallback(
		(duration: number) => {
			if (!isRetimableElement(element)) {
				return duration;
			}

			return getSourceSpanAtClipTime({
				clipTime: duration,
				retime: element.retime,
			});
		},
		[element],
	);

	const getDurationForVisibleSourceSpan = useCallback(
		(sourceSpan: number) => {
			if (!isRetimableElement(element)) {
				return sourceSpan;
			}

			return getTimelineDurationForSourceSpan({
				sourceSpan,
				retime: element.retime,
			});
		},
		[element],
	);

	const getSourceDuration = useCallback(
		({
			trimStart,
			duration,
			trimEnd,
		}: {
			trimStart: number;
			duration: number;
			trimEnd: number;
		}) => {
			if (typeof element.sourceDuration === "number") {
				return element.sourceDuration;
			}

			return trimStart + getVisibleSourceSpanForDuration(duration) + trimEnd;
		},
		[element.sourceDuration, getVisibleSourceSpanForDuration],
	);

	const cancelResize = useCallback(() => {
		if (!resizing) return;

		setCurrentTrimStart(resizing.initialTrimStart);
		setCurrentTrimEnd(resizing.initialTrimEnd);
		setCurrentStartTime(resizing.initialStartTime);
		setCurrentDuration(resizing.initialDuration);
		currentTrimStartRef.current = resizing.initialTrimStart;
		currentTrimEndRef.current = resizing.initialTrimEnd;
		currentStartTimeRef.current = resizing.initialStartTime;
		currentDurationRef.current = resizing.initialDuration;
		setResizing(null);
		onResizeStateChange?.({ isResizing: false });
		onSnapPointChange?.(null);
	}, [resizing, onResizeStateChange, onSnapPointChange]);

	useEffect(() => {
		if (!resizing) return;

		return registerCanceller({ fn: cancelResize });
	}, [resizing, cancelResize]);

	const updateTrimFromMouseMove = useCallback(
		({ clientX }: { clientX: number }) => {
			if (!resizing) return;

			const deltaX = clientX - resizing.startX;
			let deltaTime =
				deltaX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel);
			let resizeSnapPoint: SnapPoint | null = null;

			const projectFps = editor.project.getActive().settings.fps;
			const minDurationSeconds = 1 / projectFps;
			const shouldSnap = snappingEnabled && !isShiftHeldRef.current;
			if (shouldSnap) {
				const tracks = editor.timeline.getTracks();
				const playheadTime = editor.playback.getCurrentTime();
				const snapPoints = findSnapPoints({
					tracks,
					playheadTime,
					excludeElementId: element.id,
				});
				if (resizing.side === "left") {
					const targetStartTime = resizing.initialStartTime + deltaTime;
					const snapResult = snapToNearestPoint({
						targetTime: targetStartTime,
						snapPoints,
						zoomLevel,
					});
					resizeSnapPoint = snapResult.snapPoint;
					if (snapResult.snapPoint) {
						deltaTime = snapResult.snappedTime - resizing.initialStartTime;
					}
				} else {
					const baseEndTime =
						resizing.initialStartTime + resizing.initialDuration;
					const targetEndTime = baseEndTime + deltaTime;
					const snapResult = snapToNearestPoint({
						targetTime: targetEndTime,
						snapPoints,
						zoomLevel,
					});
					resizeSnapPoint = snapResult.snapPoint;
					if (snapResult.snapPoint) {
						deltaTime = snapResult.snappedTime - baseEndTime;
					}
				}
			}
			onSnapPointChange?.(resizeSnapPoint);

			const otherElements = track.elements.filter(
				({ id }) => id !== element.id,
			);
			const initialEndTime =
				resizing.initialStartTime + resizing.initialDuration;

			const rightNeighborBound =
				resizing.side === "right"
					? otherElements
							.filter(({ startTime }) => startTime >= initialEndTime)
							.reduce(
								(min, { startTime }) => Math.min(min, startTime),
								Infinity,
							)
					: Infinity;

			const leftNeighborBound =
				resizing.side === "left"
					? otherElements
							.filter(
								({ startTime, duration }) =>
									startTime + duration <= resizing.initialStartTime,
							)
							.reduce(
								(max, { startTime, duration }) =>
									Math.max(max, startTime + duration),
								-Infinity,
							)
					: -Infinity;

			if (resizing.side === "left") {
				const sourceDuration = getSourceDuration({
					trimStart: resizing.initialTrimStart,
					duration: resizing.initialDuration,
					trimEnd: resizing.initialTrimEnd,
				});
				const minTrimStartForNeighbor = Number.isFinite(leftNeighborBound)
					? Math.max(
							0,
							resizing.initialTrimStart +
								getSourceDeltaForClipDelta(
									leftNeighborBound - resizing.initialStartTime,
								),
						)
					: 0;
				const maxAllowed =
					sourceDuration -
					resizing.initialTrimEnd -
					getVisibleSourceSpanForDuration(minDurationSeconds);
				const calculated =
					resizing.initialTrimStart + getSourceDeltaForClipDelta(deltaTime);

				if (calculated >= 0 && calculated <= maxAllowed) {
				const newTrimStart = snapTimeToFrame({ time: Math.min(maxAllowed, Math.max(minTrimStartForNeighbor, calculated)), fps: projectFps });
					const visibleSourceSpan = Math.max(
						0,
						sourceDuration - newTrimStart - resizing.initialTrimEnd,
					);
				const newDuration = snapTimeToFrame({ time: getDurationForVisibleSourceSpan(visibleSourceSpan), fps: projectFps });
				const trimDelta = resizing.initialDuration - newDuration;
				const newStartTime = snapTimeToFrame({ time: resizing.initialStartTime + trimDelta, fps: projectFps });

					setCurrentTrimStart(newTrimStart);
					setCurrentStartTime(newStartTime);
					setCurrentDuration(newDuration);
					currentTrimStartRef.current = newTrimStart;
					currentStartTimeRef.current = newStartTime;
					currentDurationRef.current = newDuration;
				} else if (calculated < 0) {
					if (canExtendElementDuration()) {
						const extensionAmount = Math.abs(calculated);
						const maxExtension = resizing.initialStartTime;
						const actualExtension = Math.max(
							0,
							Number.isFinite(leftNeighborBound)
								? Math.min(
										extensionAmount,
										maxExtension,
										resizing.initialStartTime - leftNeighborBound,
									)
								: Math.min(extensionAmount, maxExtension),
						);
					const newStartTime = snapTimeToFrame({ time: resizing.initialStartTime - actualExtension, fps: projectFps });
					const newDuration = snapTimeToFrame({ time: resizing.initialDuration + actualExtension, fps: projectFps });

						setCurrentTrimStart(0);
						setCurrentStartTime(newStartTime);
						setCurrentDuration(newDuration);
						currentTrimStartRef.current = 0;
						currentStartTimeRef.current = newStartTime;
						currentDurationRef.current = newDuration;
					} else {
						const leftBound = Number.isFinite(leftNeighborBound)
							? leftNeighborBound
							: 0;
						const trimDeltaFromTrimStart =
							minTrimStartForNeighbor - resizing.initialTrimStart;
						const trimDeltaFromStartTime = getSourceDeltaForClipDelta(
							leftBound - resizing.initialStartTime,
						);
						const trimDelta = Math.max(
							trimDeltaFromTrimStart,
							trimDeltaFromStartTime,
						);
						const newTrimStart = resizing.initialTrimStart + trimDelta;
						const visibleSourceSpan = Math.max(
							0,
							sourceDuration - newTrimStart - resizing.initialTrimEnd,
						);
					const newDuration = snapTimeToFrame({ time: getDurationForVisibleSourceSpan(visibleSourceSpan), fps: projectFps });
					const newStartTime = snapTimeToFrame({ time: resizing.initialStartTime + (resizing.initialDuration - newDuration), fps: projectFps });

						setCurrentTrimStart(newTrimStart);
						setCurrentStartTime(newStartTime);
						setCurrentDuration(newDuration);
						currentTrimStartRef.current = newTrimStart;
						currentStartTimeRef.current = newStartTime;
						currentDurationRef.current = newDuration;
					}
				}
			} else {
				const sourceDuration = getSourceDuration({
					trimStart: resizing.initialTrimStart,
					duration: resizing.initialDuration,
					trimEnd: resizing.initialTrimEnd,
				});
				const newTrimEnd =
					resizing.initialTrimEnd - getSourceDeltaForClipDelta(deltaTime);
				const maxAllowedDuration = Number.isFinite(rightNeighborBound)
					? rightNeighborBound - resizing.initialStartTime
					: Infinity;

				if (newTrimEnd < 0) {
					if (canExtendElementDuration()) {
						const extensionNeeded = Math.abs(newTrimEnd);
						const baseDuration =
							resizing.initialDuration + resizing.initialTrimEnd;
					const newDuration = snapTimeToFrame({ time: Math.min(baseDuration + extensionNeeded, maxAllowedDuration), fps: projectFps });

						setCurrentDuration(newDuration);
						setCurrentTrimEnd(0);
						currentDurationRef.current = newDuration;
						currentTrimEndRef.current = 0;
					} else {
						const unclampedDuration = getDurationForVisibleSourceSpan(
							Math.max(0, sourceDuration - resizing.initialTrimStart),
						);
					const newDuration = snapTimeToFrame({ time: Math.min(unclampedDuration, maxAllowedDuration), fps: projectFps });

						setCurrentDuration(newDuration);
						setCurrentTrimEnd(0);
						currentDurationRef.current = newDuration;
						currentTrimEndRef.current = 0;
					}
				} else {
					const minTrimEndForNeighbor = Number.isFinite(maxAllowedDuration)
						? Math.max(
								0,
								sourceDuration -
									resizing.initialTrimStart -
									getVisibleSourceSpanForDuration(maxAllowedDuration),
							)
						: 0;
					const maxTrimEnd =
						sourceDuration -
						resizing.initialTrimStart -
						getVisibleSourceSpanForDuration(minDurationSeconds);
					const clampedTrimEnd = Math.min(
						maxTrimEnd,
						Math.max(minTrimEndForNeighbor, newTrimEnd),
					);
				const finalTrimEnd = snapTimeToFrame({ time: clampedTrimEnd, fps: projectFps });
					const visibleSourceSpan = Math.max(
						0,
						sourceDuration - resizing.initialTrimStart - finalTrimEnd,
					);
				const newDuration = snapTimeToFrame({ time: getDurationForVisibleSourceSpan(visibleSourceSpan), fps: projectFps });

					setCurrentTrimEnd(finalTrimEnd);
					setCurrentDuration(newDuration);
					currentTrimEndRef.current = finalTrimEnd;
					currentDurationRef.current = newDuration;
				}
			}
		},
		[
			resizing,
			zoomLevel,
			snappingEnabled,
			editor,
			element.id,
			track.elements,
			onSnapPointChange,
			canExtendElementDuration,
			getDurationForVisibleSourceSpan,
			getSourceDeltaForClipDelta,
			getSourceDuration,
			getVisibleSourceSpanForDuration,
			isShiftHeldRef,
		],
	);

	const handleResizeEnd = useCallback(() => {
		if (!resizing) return;

		const finalTrimStart = currentTrimStartRef.current;
		const finalTrimEnd = currentTrimEndRef.current;
		const finalStartTime = currentStartTimeRef.current;
		const finalDuration = currentDurationRef.current;
		const trimStartChanged = finalTrimStart !== resizing.initialTrimStart;
		const trimEndChanged = finalTrimEnd !== resizing.initialTrimEnd;
		const startTimeChanged = finalStartTime !== resizing.initialStartTime;
		const durationChanged = finalDuration !== resizing.initialDuration;

		if (
			trimStartChanged ||
			trimEndChanged ||
			startTimeChanged ||
			durationChanged
		) {
			editor.timeline.updateElementTrim({
				elementId: element.id,
				trimStart: finalTrimStart,
				trimEnd: finalTrimEnd,
				startTime: startTimeChanged ? finalStartTime : undefined,
				duration: durationChanged ? finalDuration : undefined,
				rippleEnabled: rippleEditingEnabled,
			});
		}

		setResizing(null);
		onResizeStateChange?.({ isResizing: false });
		onSnapPointChange?.(null);
	}, [
		resizing,
		editor.timeline,
		element.id,
		onResizeStateChange,
		onSnapPointChange,
		rippleEditingEnabled,
	]);

	useEffect(() => {
		if (!resizing) return;

		const handleDocumentMouseMove = ({ clientX }: MouseEvent) => {
			updateTrimFromMouseMove({ clientX });
		};

		const handleDocumentMouseUp = () => {
			handleResizeEnd();
		};

		document.addEventListener("mousemove", handleDocumentMouseMove);
		document.addEventListener("mouseup", handleDocumentMouseUp);

		return () => {
			document.removeEventListener("mousemove", handleDocumentMouseMove);
			document.removeEventListener("mouseup", handleDocumentMouseUp);
		};
	}, [resizing, handleResizeEnd, updateTrimFromMouseMove]);

	return {
		resizing,
		isResizing: resizing !== null,
		handleResizeStart,
		currentTrimStart,
		currentTrimEnd,
		currentStartTime,
		currentDuration,
	};
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorCore } from "@/core";
import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/timeline/scale";
import { TICKS_PER_SECOND } from "@/wasm";
import { useEditor } from "@/editor/use-editor";
import { useElementSelection } from "@/timeline/hooks/element/use-element-selection";
import { useShiftKey } from "@/hooks/use-shift-key";
import { useTimelineStore } from "@/timeline/timeline-store";
import {
	computeGroupResize,
	type GroupResizeMember,
	type GroupResizeResult,
	type ResizeSide,
} from "@/timeline/group-resize";
import {
	buildTimelineSnapPoints,
	getTimelineSnapThresholdInTicks,
	resolveTimelineSnap,
	type SnapPoint,
} from "@/timeline/snapping";
import { getElementEdgeSnapPoints } from "@/timeline/element-snap-source";
import { getPlayheadSnapPoints } from "@/timeline/playhead-snap-source";
import type { SceneTracks, TimelineElement, TimelineTrack } from "@/timeline";
import { isRetimableElement } from "@/timeline";
import { registerCanceller } from "@/editor/cancel-interaction";
import { getAnimationKeyframeSnapPointsForTimeline } from "@/animation/timeline-snap-points";

interface ResizeInteractionState {
	side: ResizeSide;
	startX: number;
	members: GroupResizeMember[];
}

export function useTimelineResize({
	zoomLevel,
	onSnapPointChange,
}: {
	zoomLevel: number;
	onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
}) {
	const editor = useEditor();
	const isShiftHeldRef = useShiftKey();
	const snappingEnabled = useTimelineStore((state) => state.snappingEnabled);
	const { selectedElements } = useElementSelection();
	const [resizeState, setResizeState] = useState<ResizeInteractionState | null>(
		null,
	);
	const latestResultRef = useRef<GroupResizeResult | null>(null);

	const cancelResize = useCallback(() => {
		editor.timeline.discardPreview();
		setResizeState(null);
		latestResultRef.current = null;
		onSnapPointChange?.(null);
	}, [editor.timeline, onSnapPointChange]);

	useEffect(() => {
		if (!resizeState) {
			return;
		}

		return registerCanceller({ fn: cancelResize });
	}, [resizeState, cancelResize]);

	const handleResizeStart = useCallback(
		({
			event,
			element,
			track,
			side,
		}: {
			event: React.MouseEvent;
			element: TimelineElement;
			track: TimelineTrack;
			side: ResizeSide;
		}) => {
			event.stopPropagation();
			event.preventDefault();

			const elementRef = {
				trackId: track.id,
				elementId: element.id,
			};
			const activeSelection = selectedElements.some(
				(selectedElement) =>
					selectedElement.trackId === track.id &&
					selectedElement.elementId === element.id,
			)
				? selectedElements
				: [elementRef];
			const members = buildResizeMembers({
				tracks: editor.scenes.getActiveScene().tracks,
				selectedElements: activeSelection,
			});
			if (members.length === 0) {
				return;
			}

			editor.timeline.discardPreview();
			latestResultRef.current = null;
			setResizeState({
				side,
				startX: event.clientX,
				members,
			});
		},
		[selectedElements, editor],
	);

	useEffect(() => {
		if (!resizeState) {
			return;
		}

		const handleMouseMove = ({ clientX }: MouseEvent) => {
			const deltaX = clientX - resizeState.startX;
			const rawDeltaTime = Math.round(
				(deltaX / (BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel)) *
					TICKS_PER_SECOND,
			);
			const snappedDeltaTime = getSnappedResizeDelta({
				editor,
				resizeState,
				rawDeltaTime,
				zoomLevel,
				shouldSnap: snappingEnabled && !isShiftHeldRef.current,
				onSnapPointChange,
			});
			const fps = editor.project.getActive().settings.fps;
			const result = computeGroupResize({
				members: resizeState.members,
				side: resizeState.side,
				deltaTime: snappedDeltaTime.deltaTime,
				fps,
			});

			latestResultRef.current = result;
			editor.timeline.previewElements({
				updates: result.updates.map(({ trackId, elementId, patch }) => ({
					trackId,
					elementId,
					updates: patch,
				})),
			});
		};

		const handleMouseUp = () => {
			const result = latestResultRef.current;
			editor.timeline.discardPreview();
			if (
				result &&
				hasResizeChanges({ members: resizeState.members, result })
			) {
				editor.timeline.updateElements({
					updates: result.updates.map(({ trackId, elementId, patch }) => ({
						trackId,
						elementId,
						patch,
					})),
				});
			}

			setResizeState(null);
			latestResultRef.current = null;
			onSnapPointChange?.(null);
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [
		resizeState,
		zoomLevel,
		snappingEnabled,
		isShiftHeldRef,
		editor,
		onSnapPointChange,
	]);

	return {
		isResizing: resizeState !== null,
		handleResizeStart,
	};
}

function buildResizeMembers({
	tracks,
	selectedElements,
}: {
	tracks: SceneTracks;
	selectedElements: Array<{ trackId: string; elementId: string }>;
}): GroupResizeMember[] {
	const selectedElementIds = new Set(
		selectedElements.map((selectedElement) => selectedElement.elementId),
	);
	const trackMap = new Map(
		[...tracks.overlay, tracks.main, ...tracks.audio].map((track) => [
			track.id,
			track,
		]),
	);

	return selectedElements.flatMap(({ trackId, elementId }) => {
		const track = trackMap.get(trackId);
		const element = track?.elements.find(
			(trackElement) => trackElement.id === elementId,
		);
		if (!track || !element) {
			return [];
		}

		const otherElements = track.elements.filter(
			(trackElement) => !selectedElementIds.has(trackElement.id),
		);
		const leftNeighborBound = otherElements
			.filter(
				(trackElement) =>
					trackElement.startTime + trackElement.duration <= element.startTime,
			)
			.reduce((bound, trackElement) => {
				return Math.max(bound, trackElement.startTime + trackElement.duration);
			}, -Infinity);
		const rightNeighborBound = otherElements
			.filter(
				(trackElement) =>
					trackElement.startTime >= element.startTime + element.duration,
			)
			.reduce((bound, trackElement) => {
				return Math.min(bound, trackElement.startTime);
			}, Infinity);

		return [
			{
				trackId,
				elementId,
				startTime: element.startTime,
				duration: element.duration,
				trimStart: element.trimStart,
				trimEnd: element.trimEnd,
				sourceDuration: element.sourceDuration,
				retime: isRetimableElement(element) ? element.retime : undefined,
				leftNeighborBound,
				rightNeighborBound,
			},
		];
	});
}

function getSnappedResizeDelta({
	editor,
	resizeState,
	rawDeltaTime,
	zoomLevel,
	shouldSnap,
	onSnapPointChange,
}: {
	editor: EditorCore;
	resizeState: ResizeInteractionState;
	rawDeltaTime: number;
	zoomLevel: number;
	shouldSnap: boolean;
	onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
}): { deltaTime: number } {
	if (!shouldSnap) {
		onSnapPointChange?.(null);
		return { deltaTime: rawDeltaTime };
	}

	const tracks = editor.scenes.getActiveScene().tracks;
	const playheadTime = editor.playback.getCurrentTime();
	const excludeElementIds = new Set(
		resizeState.members.map((member) => member.elementId),
	);
	const snapPoints = buildTimelineSnapPoints({
		sources: [
			() => getElementEdgeSnapPoints({ tracks, excludeElementIds }),
			() => getPlayheadSnapPoints({ playheadTime }),
			() =>
				getAnimationKeyframeSnapPointsForTimeline({
					tracks,
					excludeElementIds,
				}),
		],
	});
	const maxSnapDistance = getTimelineSnapThresholdInTicks({ zoomLevel });
	let closestSnapPoint: SnapPoint | null = null;
	let closestSnapDistance = Infinity;
	let deltaTime = rawDeltaTime;

	for (const member of resizeState.members) {
		const baseEdgeTime =
			resizeState.side === "left"
				? member.startTime
				: member.startTime + member.duration;
		const snapResult = resolveTimelineSnap({
			targetTime: baseEdgeTime + rawDeltaTime,
			snapPoints,
			maxSnapDistance,
		});
		if (snapResult.snapPoint && snapResult.snapDistance < closestSnapDistance) {
			closestSnapDistance = snapResult.snapDistance;
			closestSnapPoint = snapResult.snapPoint;
			deltaTime = snapResult.snappedTime - baseEdgeTime;
		}
	}

	onSnapPointChange?.(closestSnapPoint);
	return { deltaTime };
}

function hasResizeChanges({
	members,
	result,
}: {
	members: GroupResizeMember[];
	result: GroupResizeResult;
}): boolean {
	return result.updates.some((update) => {
		const member = members.find(
			(candidateMember) => candidateMember.elementId === update.elementId,
		);
		return (
			member?.trimStart !== update.patch.trimStart ||
			member?.trimEnd !== update.patch.trimEnd ||
			member?.startTime !== update.patch.startTime ||
			member?.duration !== update.patch.duration
		);
	});
}

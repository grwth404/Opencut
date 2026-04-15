import {
	useState,
	useCallback,
	useEffect,
	useRef,
	type MouseEvent as ReactMouseEvent,
	type RefObject,
} from "react";
import { useEditor } from "@/hooks/use-editor";
import { useShiftKey } from "@/hooks/use-shift-key";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import {
	buildMoveGroup,
	resolveGroupMove,
	snapGroupEdges,
	type GroupMoveResult,
	type MoveGroup,
} from "@/lib/timeline/group-move";
import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/lib/timeline/scale";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { TIMELINE_DRAG_THRESHOLD_PX } from "@/components/editor/panels/timeline/interaction";
import { roundToFrame } from "opencut-wasm";
import { computeDropTarget } from "@/components/editor/panels/timeline/drop-target";
import { getMouseTimeFromClientX } from "@/lib/timeline/drag-utils";
import { generateUUID } from "@/utils/id";
import type { SnapPoint } from "@/lib/timeline/snap-utils";
import { registerCanceller } from "@/lib/cancel-interaction";
import type {
	DropTarget,
	ElementRef,
	ElementDragState,
	SceneTracks,
	TimelineElement,
	TimelineTrack,
} from "@/lib/timeline";

interface UseElementInteractionProps {
	zoomLevel: number;
	timelineRef: RefObject<HTMLDivElement | null>;
	tracksContainerRef: RefObject<HTMLDivElement | null>;
	tracksScrollRef: RefObject<HTMLDivElement | null>;
	headerRef?: RefObject<HTMLElement | null>;
	snappingEnabled: boolean;
	onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
}

const MOUSE_BUTTON_RIGHT = 2;

const initialDragState: ElementDragState = {
	isDragging: false,
	elementId: null,
	dragElementIds: [],
	dragTimeOffsets: {},
	trackId: null,
	startMouseX: 0,
	startMouseY: 0,
	startElementTime: 0,
	clickOffsetTime: 0,
	currentTime: 0,
	currentMouseY: 0,
};

interface PendingDragState {
	elementId: string;
	trackId: string;
	selectedElements: ElementRef[];
	startMouseX: number;
	startMouseY: number;
	startElementTime: number;
	clickOffsetTime: number;
}

function getClickOffsetTime({
	clientX,
	elementRect,
	zoomLevel,
}: {
	clientX: number;
	elementRect: DOMRect;
	zoomLevel: number;
}): number {
	const clickOffsetX = clientX - elementRect.left;
	const seconds = clickOffsetX / (BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel);
	return Math.round(seconds * TICKS_PER_SECOND);
}

function getVerticalDragDirection({
	startMouseY,
	currentMouseY,
}: {
	startMouseY: number;
	currentMouseY: number;
}): "up" | "down" | null {
	if (currentMouseY < startMouseY) return "up";
	if (currentMouseY > startMouseY) return "down";
	return null;
}

function getDragDropTarget({
	clientX,
	clientY,
	elementId,
	trackId,
	tracks,
	tracksContainerRef,
	tracksScrollRef,
	headerRef,
	zoomLevel,
	snappedTime,
	verticalDragDirection,
}: {
	clientX: number;
	clientY: number;
	elementId: string;
	trackId: string;
	tracks: SceneTracks;
	tracksContainerRef: RefObject<HTMLDivElement | null>;
	tracksScrollRef: RefObject<HTMLDivElement | null>;
	headerRef?: RefObject<HTMLElement | null>;
	zoomLevel: number;
	snappedTime: number;
	verticalDragDirection?: "up" | "down" | null;
}): DropTarget | null {
	const containerRect = tracksContainerRef.current?.getBoundingClientRect();
	const scrollContainer = tracksScrollRef.current;
	if (!containerRect || !scrollContainer) return null;

	const sourceTrack = [...tracks.overlay, tracks.main, ...tracks.audio].find(
		({ id }) => id === trackId,
	);
	const movingElement = sourceTrack?.elements.find(
		({ id }) => id === elementId,
	);
	if (!movingElement) return null;

	const elementDuration = movingElement.duration;
	const scrollLeft = scrollContainer.scrollLeft;
	const scrollTop = scrollContainer.scrollTop;
	const scrollContainerRect = scrollContainer.getBoundingClientRect();
	const headerHeight = headerRef?.current?.getBoundingClientRect().height ?? 0;
	const mouseX = clientX - scrollContainerRect.left + scrollLeft;
	const mouseY = clientY - scrollContainerRect.top + scrollTop - headerHeight;

	return computeDropTarget({
		elementType: movingElement.type,
		mouseX,
		mouseY,
		tracks,
		playheadTime: snappedTime,
		isExternalDrop: false,
		elementDuration,
		pixelsPerSecond: BASE_TIMELINE_PIXELS_PER_SECOND,
		zoomLevel,
		startTimeOverride: snappedTime,
		excludeElementId: movingElement.id,
		verticalDragDirection,
	});
}

interface StartDragParams
	extends Omit<
		ElementDragState,
		"isDragging" | "currentTime" | "currentMouseY"
	> {
	initialCurrentTime: number;
	initialCurrentMouseY: number;
}

export function useElementInteraction({
	zoomLevel,
	timelineRef,
	tracksContainerRef,
	tracksScrollRef,
	headerRef,
	snappingEnabled,
	onSnapPointChange,
}: UseElementInteractionProps) {
	const editor = useEditor();
	const isShiftHeldRef = useShiftKey();
	const sceneTracks = editor.scenes.getActiveScene().tracks;
	const {
		selectedElements,
		isElementSelected,
		selectElement,
		handleElementClick: handleSelectionClick,
	} = useElementSelection();

	const [dragState, setDragState] =
		useState<ElementDragState>(initialDragState);
	const [dragDropTarget, setDragDropTarget] = useState<DropTarget | null>(null);
	const [isPendingDrag, setIsPendingDrag] = useState(false);
	const pendingDragRef = useRef<PendingDragState | null>(null);
	const moveGroupRef = useRef<MoveGroup | null>(null);
	const newTrackIdsRef = useRef<string[]>([]);
	const groupMoveResultRef = useRef<GroupMoveResult | null>(null);
	const lastMouseXRef = useRef(0);
	const mouseDownLocationRef = useRef<{ x: number; y: number } | null>(null);

	const startDrag = useCallback(
		({
			elementId,
			dragElementIds,
			dragTimeOffsets,
			trackId,
			startMouseX,
			startMouseY,
			startElementTime,
			clickOffsetTime,
			initialCurrentTime,
			initialCurrentMouseY,
		}: StartDragParams) => {
			setDragState({
				isDragging: true,
				elementId,
				dragElementIds,
				dragTimeOffsets,
				trackId,
				startMouseX,
				startMouseY,
				startElementTime,
				clickOffsetTime,
				currentTime: initialCurrentTime,
				currentMouseY: initialCurrentMouseY,
			});
		},
		[],
	);

	const endDrag = useCallback(() => {
		moveGroupRef.current = null;
		newTrackIdsRef.current = [];
		groupMoveResultRef.current = null;
		setDragState(initialDragState);
		setDragDropTarget(null);
	}, []);

	const cancelCurrentDrag = useCallback(() => {
		pendingDragRef.current = null;
		mouseDownLocationRef.current = null;
		setIsPendingDrag(false);
		endDrag();
		onSnapPointChange?.(null);
	}, [endDrag, onSnapPointChange]);

	const resolveGroupDragMove = useCallback(
		({
			group,
			snappedTime,
			dropTarget,
		}: {
			group: MoveGroup;
			snappedTime: number;
			dropTarget: DropTarget | null;
		}): GroupMoveResult | null => {
			if (!dropTarget) {
				return null;
			}

			if (dropTarget.isNewTrack) {
				return resolveGroupMove({
					group,
					tracks: sceneTracks,
					anchorStartTime: snappedTime,
					target: {
						kind: "newTracks",
						anchorInsertIndex: dropTarget.trackIndex,
						newTrackIds: newTrackIdsRef.current,
					},
				});
			}

			const orderedTracks = [
				...sceneTracks.overlay,
				sceneTracks.main,
				...sceneTracks.audio,
			];
			const targetTrack = orderedTracks[dropTarget.trackIndex];
			if (!targetTrack) {
				return null;
			}

			const existingTrackResult = resolveGroupMove({
				group,
				tracks: sceneTracks,
				anchorStartTime: snappedTime,
				target: {
					kind: "existingTrack",
					anchorTargetTrackId: targetTrack.id,
				},
			});
			if (existingTrackResult) {
				return existingTrackResult;
			}

			return resolveGroupMove({
				group,
				tracks: sceneTracks,
				anchorStartTime: snappedTime,
				target: {
					kind: "newTracks",
					anchorInsertIndex: dropTarget.trackIndex,
					newTrackIds: newTrackIdsRef.current,
				},
			});
		},
		[sceneTracks],
	);

	useEffect(() => {
		if (!dragState.isDragging && !isPendingDrag) return;

		return registerCanceller({ fn: cancelCurrentDrag });
	}, [dragState.isDragging, isPendingDrag, cancelCurrentDrag]);

	const getDragSnapResult = useCallback(
		({
			frameSnappedTime,
			group,
		}: {
			frameSnappedTime: number;
			group: MoveGroup | null;
		}) => {
			if (!group || !snappingEnabled || isShiftHeldRef.current) {
				return { snappedTime: frameSnappedTime, snapPoint: null };
			}

			const groupSnap = snapGroupEdges({
				group,
				anchorStartTime: frameSnappedTime,
				tracks: sceneTracks,
				playheadTime: editor.playback.getCurrentTime(),
				zoomLevel,
			});

			return {
				snappedTime: groupSnap.snappedAnchorStartTime,
				snapPoint: groupSnap.snapPoint,
			};
		},
		[snappingEnabled, editor.playback, sceneTracks, zoomLevel, isShiftHeldRef],
	);

	useEffect(() => {
		if (!dragState.isDragging && !isPendingDrag) return;

		const handleMouseMove = ({ clientX, clientY }: MouseEvent) => {
			let startedDragThisEvent = false;
			const timeline = timelineRef.current;
			const scrollContainer = tracksScrollRef.current;
			if (!timeline || !scrollContainer) return;
			lastMouseXRef.current = clientX;

			if (isPendingDrag && pendingDragRef.current) {
				const deltaX = Math.abs(clientX - pendingDragRef.current.startMouseX);
				const deltaY = Math.abs(clientY - pendingDragRef.current.startMouseY);
				if (
					deltaX > TIMELINE_DRAG_THRESHOLD_PX ||
					deltaY > TIMELINE_DRAG_THRESHOLD_PX
				) {
					const activeProject = editor.project.getActive();
					if (!activeProject) return;
					const scrollLeft = scrollContainer.scrollLeft;
					const mouseTime = getMouseTimeFromClientX({
						clientX,
						containerRect: scrollContainer.getBoundingClientRect(),
						zoomLevel,
						scrollLeft,
					});
					const adjustedTime = Math.max(
						0,
						mouseTime - pendingDragRef.current.clickOffsetTime,
					);
					const snappedTime =
						roundToFrame({
							time: adjustedTime,
							rate: activeProject.settings.fps,
						}) ?? adjustedTime;
					const moveGroup = buildMoveGroup({
						anchorRef: {
							trackId: pendingDragRef.current.trackId,
							elementId: pendingDragRef.current.elementId,
						},
						selectedElements: pendingDragRef.current.selectedElements,
						tracks: sceneTracks,
					});
					if (!moveGroup) {
						return;
					}

					moveGroupRef.current = moveGroup;
					newTrackIdsRef.current = moveGroup.members.map(() => generateUUID());
					const dragTimeOffsets: Record<string, number> = {};
					for (const member of moveGroup.members) {
						dragTimeOffsets[member.elementId] = member.timeOffset;
					}
					const {
						snappedTime: initialSnappedTime,
						snapPoint: initialSnapPoint,
					} = getDragSnapResult({
						frameSnappedTime: snappedTime,
						group: moveGroup,
					});
					const verticalDragDirection = getVerticalDragDirection({
						startMouseY: pendingDragRef.current.startMouseY,
						currentMouseY: clientY,
					});
					const anchorDropTarget = getDragDropTarget({
						clientX,
						clientY,
						elementId: pendingDragRef.current.elementId,
						trackId: pendingDragRef.current.trackId,
						tracks: sceneTracks,
						tracksContainerRef,
						tracksScrollRef,
						headerRef,
						zoomLevel,
						snappedTime: initialSnappedTime,
						verticalDragDirection,
					});
					const nextGroupMoveResult =
						anchorDropTarget != null
							? resolveGroupDragMove({
									group: moveGroup,
									snappedTime: initialSnappedTime,
									dropTarget: anchorDropTarget,
								})
							: null;
					groupMoveResultRef.current = nextGroupMoveResult;
					setDragDropTarget(
						anchorDropTarget &&
							(anchorDropTarget.isNewTrack || !nextGroupMoveResult)
							? {
									...anchorDropTarget,
									isNewTrack: true,
								}
							: null,
					);
					startDrag({
						...pendingDragRef.current,
						dragElementIds: moveGroup.members.map((member) => member.elementId),
						dragTimeOffsets,
						initialCurrentTime: initialSnappedTime,
						initialCurrentMouseY: clientY,
					});
					onSnapPointChange?.(initialSnapPoint);
					startedDragThisEvent = true;
					pendingDragRef.current = null;
					setIsPendingDrag(false);
				} else {
					return;
				}
			}

			if (startedDragThisEvent) {
				return;
			}

			if (dragState.elementId && dragState.trackId) {
				const alreadySelected = isElementSelected({
					trackId: dragState.trackId,
					elementId: dragState.elementId,
				});
				if (!alreadySelected) {
					selectElement({
						trackId: dragState.trackId,
						elementId: dragState.elementId,
					});
				}
			}

			const activeProject = editor.project.getActive();
			if (!activeProject) return;

			const scrollLeft = scrollContainer.scrollLeft;
			const mouseTime = getMouseTimeFromClientX({
				clientX,
				containerRect: scrollContainer.getBoundingClientRect(),
				zoomLevel,
				scrollLeft,
			});
			const adjustedTime = Math.max(0, mouseTime - dragState.clickOffsetTime);
			const fps = activeProject.settings.fps;
			const frameSnappedTime =
				roundToFrame({ time: adjustedTime, rate: fps }) ?? adjustedTime;

			const moveGroup = moveGroupRef.current;
			const { snappedTime, snapPoint } = getDragSnapResult({
				frameSnappedTime,
				group: moveGroup,
			});
			setDragState((previousDragState) => ({
				...previousDragState,
				currentTime: snappedTime,
				currentMouseY: clientY,
			}));
			onSnapPointChange?.(snapPoint);

			if (dragState.elementId && dragState.trackId) {
				const verticalDragDirection = getVerticalDragDirection({
					startMouseY: dragState.startMouseY,
					currentMouseY: clientY,
				});
				const anchorDropTarget = getDragDropTarget({
					clientX,
					clientY,
					elementId: dragState.elementId,
					trackId: dragState.trackId,
					tracks: sceneTracks,
					tracksContainerRef,
					tracksScrollRef,
					headerRef,
					zoomLevel,
					snappedTime,
					verticalDragDirection,
				});
				const nextGroupMoveResult =
					moveGroup && anchorDropTarget
						? resolveGroupDragMove({
								group: moveGroup,
								snappedTime,
								dropTarget: anchorDropTarget,
							})
						: null;
				groupMoveResultRef.current = nextGroupMoveResult;
				setDragDropTarget(
					anchorDropTarget &&
						(anchorDropTarget.isNewTrack || !nextGroupMoveResult)
						? {
								...anchorDropTarget,
								isNewTrack: true,
							}
						: null,
				);
			}
		};

		document.addEventListener("mousemove", handleMouseMove);
		return () => document.removeEventListener("mousemove", handleMouseMove);
	}, [
		dragState.isDragging,
		dragState.clickOffsetTime,
		dragState.elementId,
		dragState.startMouseY,
		dragState.trackId,
		zoomLevel,
		isElementSelected,
		selectElement,
		editor.project,
		timelineRef,
		tracksScrollRef,
		tracksContainerRef,
		headerRef,
		isPendingDrag,
		startDrag,
		getDragSnapResult,
		resolveGroupDragMove,
		sceneTracks,
		onSnapPointChange,
	]);

	useEffect(() => {
		if (!dragState.isDragging) return;

		const handleMouseUp = ({ clientX, clientY }: MouseEvent) => {
			if (!dragState.elementId || !dragState.trackId) return;

			if (mouseDownLocationRef.current) {
				const deltaX = Math.abs(clientX - mouseDownLocationRef.current.x);
				const deltaY = Math.abs(clientY - mouseDownLocationRef.current.y);
				if (
					deltaX <= TIMELINE_DRAG_THRESHOLD_PX &&
					deltaY <= TIMELINE_DRAG_THRESHOLD_PX
				) {
					mouseDownLocationRef.current = null;
					endDrag();
					onSnapPointChange?.(null);
					return;
				}
			}

			const moveGroup = moveGroupRef.current;
			if (!moveGroup) {
				endDrag();
				onSnapPointChange?.(null);
				return;
			}

			const groupMoveResult = groupMoveResultRef.current;
			if (!groupMoveResult) {
				endDrag();
				onSnapPointChange?.(null);
				return;
			}

			const didMove = groupMoveResult.moves.some((move) => {
				const currentMember = moveGroup.members.find(
					(member) => member.elementId === move.elementId,
				);
				const originalStartTime =
					dragState.startElementTime + (currentMember?.timeOffset ?? 0);
				return (
					currentMember?.trackId !== move.targetTrackId ||
					originalStartTime !== move.newStartTime
				);
			});
			if (!didMove && groupMoveResult.createTracks.length === 0) {
				endDrag();
				onSnapPointChange?.(null);
				return;
			}

			editor.timeline.moveElements({
				moves: groupMoveResult.moves,
				createTracks: groupMoveResult.createTracks,
			});
			endDrag();
			onSnapPointChange?.(null);
		};

		document.addEventListener("mouseup", handleMouseUp);
		return () => document.removeEventListener("mouseup", handleMouseUp);
	}, [
		dragState.isDragging,
		dragState.elementId,
		dragState.startElementTime,
		dragState.trackId,
		endDrag,
		onSnapPointChange,
		editor.timeline,
	]);

	useEffect(() => {
		if (!isPendingDrag) return;

		const handleMouseUp = () => {
			pendingDragRef.current = null;
			setIsPendingDrag(false);
			onSnapPointChange?.(null);
		};

		document.addEventListener("mouseup", handleMouseUp);
		return () => document.removeEventListener("mouseup", handleMouseUp);
	}, [isPendingDrag, onSnapPointChange]);

	const handleElementMouseDown = useCallback(
		({
			event,
			element,
			track,
		}: {
			event: ReactMouseEvent;
			element: TimelineElement;
			track: TimelineTrack;
		}) => {
			const isRightClick = event.button === MOUSE_BUTTON_RIGHT;

			// right-click: don't stop propagation so ContextMenu can open
			if (isRightClick) {
				const alreadySelected = isElementSelected({
					trackId: track.id,
					elementId: element.id,
				});
				if (!alreadySelected) {
					handleSelectionClick({
						trackId: track.id,
						elementId: element.id,
						isMultiKey: false,
					});
				}
				return;
			}

			event.stopPropagation();
			mouseDownLocationRef.current = { x: event.clientX, y: event.clientY };

			const isMultiSelect = event.metaKey || event.ctrlKey || event.shiftKey;

			if (isMultiSelect) {
				handleSelectionClick({
					trackId: track.id,
					elementId: element.id,
					isMultiKey: true,
				});
			}

			const clickOffsetTime = getClickOffsetTime({
				clientX: event.clientX,
				elementRect: event.currentTarget.getBoundingClientRect(),
				zoomLevel,
			});
			const elementRef = {
				trackId: track.id,
				elementId: element.id,
			};
			const pendingSelectedElements = isElementSelected(elementRef)
				? selectedElements
				: [elementRef];
			pendingDragRef.current = {
				elementId: element.id,
				trackId: track.id,
				selectedElements: pendingSelectedElements,
				startMouseX: event.clientX,
				startMouseY: event.clientY,
				startElementTime: element.startTime,
				clickOffsetTime,
			};
			setIsPendingDrag(true);
		},
		[zoomLevel, isElementSelected, handleSelectionClick, selectedElements],
	);

	const handleElementClick = useCallback(
		({
			event,
			element,
			track,
		}: {
			event: ReactMouseEvent;
			element: TimelineElement;
			track: TimelineTrack;
		}) => {
			event.stopPropagation();

			if (mouseDownLocationRef.current) {
				const deltaX = Math.abs(event.clientX - mouseDownLocationRef.current.x);
				const deltaY = Math.abs(event.clientY - mouseDownLocationRef.current.y);
				if (
					deltaX > TIMELINE_DRAG_THRESHOLD_PX ||
					deltaY > TIMELINE_DRAG_THRESHOLD_PX
				) {
					mouseDownLocationRef.current = null;
					return;
				}
			}

			// modifier keys already handled in mousedown
			if (event.metaKey || event.ctrlKey || event.shiftKey) return;

			const alreadySelected = isElementSelected({
				trackId: track.id,
				elementId: element.id,
			});
			if (!alreadySelected || selectedElements.length > 1) {
				selectElement({ trackId: track.id, elementId: element.id });
				return;
			}

			editor.selection.clearKeyframeSelection();
		},
		[editor.selection, isElementSelected, selectElement, selectedElements],
	);

	return {
		dragState,
		dragDropTarget,
		handleElementMouseDown,
		handleElementClick,
		lastMouseXRef,
	};
}

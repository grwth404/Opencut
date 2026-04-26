import { useEffect, useReducer, useRef, type RefObject } from "react";
import { useEditor } from "@/editor/use-editor";
import { useShiftKey } from "@/hooks/use-shift-key";
import { useElementSelection } from "@/timeline/hooks/element/use-element-selection";
import { registerCanceller } from "@/editor/cancel-interaction";
import {
	ElementInteractionController,
	type ElementInteractionDeps,
	type ElementInteractionDepsRef,
} from "@/timeline/controllers/element-interaction-controller";
import type { SnapPoint } from "@/timeline/snapping";

interface UseElementInteractionProps {
	zoomLevel: number;
	tracksContainerRef: RefObject<HTMLDivElement | null>;
	tracksScrollRef: RefObject<HTMLDivElement | null>;
	headerRef?: RefObject<HTMLElement | null>;
	snappingEnabled: boolean;
	onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
}

export function useElementInteraction({
	zoomLevel,
	tracksContainerRef,
	tracksScrollRef,
	headerRef,
	snappingEnabled,
	onSnapPointChange,
}: UseElementInteractionProps) {
	const editor = useEditor();
	const isShiftHeldRef = useShiftKey();
	const selection = useElementSelection();

	const deps: ElementInteractionDeps = {
		viewport: {
			getZoomLevel: () => zoomLevel,
			getTracksScrollEl: () => tracksScrollRef.current,
			getTracksContainerEl: () => tracksContainerRef.current,
			getHeaderEl: () => headerRef?.current ?? null,
		},
		input: {
			isShiftHeld: () => isShiftHeldRef.current,
		},
		scene: {
			getTracks: () => editor.scenes.getActiveScene().tracks,
			getActiveFps: () => editor.project.getActive()?.settings.fps ?? null,
		},
		selection: {
			getSelected: () => selection.selectedElements,
			isSelected: selection.isElementSelected,
			select: selection.selectElement,
			handleClick: selection.handleElementClick,
			clearKeyframeSelection: () => editor.selection.clearKeyframeSelection(),
		},
		playback: {
			getCurrentTime: () => editor.playback.getCurrentTime(),
		},
		timeline: {
			moveElements: (args) => editor.timeline.moveElements(args),
		},
		snap: {
			isEnabled: () => snappingEnabled,
			onChange: onSnapPointChange,
		},
	};

	const depsRef = useRef<ElementInteractionDeps>(deps);
	depsRef.current = deps;

	const controllerRef = useRef<ElementInteractionController | null>(null);
	if (!controllerRef.current) {
		controllerRef.current = new ElementInteractionController({
			depsRef: depsRef as ElementInteractionDepsRef,
		});
	}
	const controller = controllerRef.current;

	const [, rerender] = useReducer((n: number) => n + 1, 0);
	useEffect(() => controller.subscribe(rerender), [controller]);

	useEffect(() => {
		if (!controller.isActive) return;
		return registerCanceller({ fn: () => controller.cancel() });
	}, [controller.isActive, controller]);

	useEffect(() => () => controller.destroy(), [controller]);

	return {
		dragView: controller.view,
		handleElementMouseDown: controller.onElementMouseDown,
		handleElementClick: controller.onElementClick,
	};
}

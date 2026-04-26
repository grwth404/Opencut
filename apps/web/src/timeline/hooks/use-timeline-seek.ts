import { useEffect, useRef, type RefObject } from "react";
import { useEditor } from "@/editor/use-editor";
import {
	SeekController,
	type SeekConfig,
} from "@/timeline/controllers/seek-controller";
import type { MediaTime } from "@/wasm";

interface UseTimelineSeekProps {
	playheadRef: RefObject<HTMLDivElement | null>;
	trackLabelsRef: RefObject<HTMLDivElement | null>;
	rulerScrollRef: RefObject<HTMLDivElement | null>;
	tracksScrollRef: RefObject<HTMLDivElement | null>;
	zoomLevel: number;
	duration: MediaTime;
	isSelecting: boolean;
	clearSelectedElements: () => void;
	seek: (time: MediaTime) => void;
}

export function useTimelineSeek({
	playheadRef,
	trackLabelsRef,
	rulerScrollRef,
	tracksScrollRef,
	zoomLevel,
	duration,
	isSelecting,
	clearSelectedElements,
	seek,
}: UseTimelineSeekProps) {
	const editor = useEditor();
	const config: SeekConfig = {
		zoomLevel,
		duration,
		isSelecting,
		getPlayheadEl: () => playheadRef.current,
		getTrackLabelsEl: () => trackLabelsRef.current,
		getRulerScrollEl: () => rulerScrollRef.current,
		getTracksScrollEl: () => tracksScrollRef.current,
		getActiveProjectFps: () => editor.project.getActive()?.settings.fps ?? null,
		clearSelectedElements,
		seek,
		setTimelineViewState: ({ zoomLevel, scrollLeft, playheadTime }) =>
			editor.project.setTimelineViewState({
				viewState: {
					zoomLevel,
					scrollLeft,
					playheadTime,
				},
			}),
	};

	const configRef = useRef(config);
	configRef.current = config;

	const controllerRef = useRef<SeekController | null>(null);
	if (!controllerRef.current) {
		controllerRef.current = new SeekController({ configRef });
	}
	const controller = controllerRef.current;

	useEffect(() => () => controller.destroy(), [controller]);

	return {
		handleTracksMouseDown: controller.onTracksMouseDown,
		handleTracksClick: controller.onTracksClick,
		handleRulerMouseDown: controller.onRulerMouseDown,
		handleRulerClick: controller.onRulerClick,
	};
}

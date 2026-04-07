"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { registerCanceller } from "@/lib/cancel-interaction";
import type { NormalizedCubicBezier } from "@/lib/animation/types";
import { useKeyframeSelection } from "@/hooks/timeline/element/use-keyframe-selection";
import {
	applyGraphEditorCurvePreview,
	buildGraphEditorCurvePatches,
	resolveGraphEditorSelectionState,
	type GraphEditorSelectionState,
} from "./session";

export function useGraphEditorController() {
	const editor = useEditor();
	const renderTracks = useEditor((currentEditor) =>
		currentEditor.timeline.getPreviewTracks() ??
			currentEditor.scenes.getActiveScene().tracks,
	);
	const { selectedKeyframes } = useKeyframeSelection();
	const [open, setOpen] = useState(false);
	const [activeComponentKey, setActiveComponentKey] = useState<string | null>(
		null,
	);
	const hasPreviewRef = useRef(false);

	const state = useMemo<GraphEditorSelectionState>(
		() =>
			resolveGraphEditorSelectionState({
				tracks: renderTracks,
				selectedKeyframes,
				preferredComponentKey: activeComponentKey,
			}),
		[activeComponentKey, renderTracks, selectedKeyframes],
	);

	const stateKey =
		state.status === "ready"
			? `${state.trackId}:${state.elementId}:${state.propertyPath}:${state.keyframeId}:${state.activeComponentKey}`
			: `${state.status}:${state.reason}:${state.activeComponentKey ?? "none"}`;
	const previousStateKeyRef = useRef(stateKey);

	const discardPreview = useCallback(() => {
		if (!hasPreviewRef.current) {
			return;
		}

		editor.timeline.discardPreview();
		hasPreviewRef.current = false;
	}, [editor]);

	useEffect(() => {
		if (hasPreviewRef.current && previousStateKeyRef.current !== stateKey) {
			discardPreview();
		}

		previousStateKeyRef.current = stateKey;
	}, [discardPreview, stateKey]);

	useEffect(() => {
		if (!open) {
			return;
		}

		return registerCanceller({
			fn: () => {
				discardPreview();
				setOpen(false);
			},
		});
	}, [discardPreview, open]);

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (!nextOpen) {
				discardPreview();
			}

			setOpen(nextOpen);
		},
		[discardPreview],
	);

	const handleActiveComponentKeyChange = useCallback(
		(nextComponentKey: string) => {
			discardPreview();
			setActiveComponentKey(nextComponentKey);
		},
		[discardPreview],
	);

	const handlePreviewValue = useCallback(
		(nextValue: NormalizedCubicBezier) => {
			if (state.status !== "ready") {
				return;
			}

			const nextAnimations = applyGraphEditorCurvePreview({
				animations: state.element.animations,
				context: state.context,
				cubicBezier: nextValue,
			});
			editor.timeline.previewElements({
				updates: [
					{
						trackId: state.trackId,
						elementId: state.elementId,
						updates: {
							animations: nextAnimations,
						},
					},
				],
			});
			hasPreviewRef.current = true;
		},
		[editor, state],
	);

	const handleCommitValue = useCallback(
		(nextValue: NormalizedCubicBezier) => {
			if (state.status !== "ready") {
				return;
			}

			const patches = buildGraphEditorCurvePatches({
				context: state.context,
				cubicBezier: nextValue,
			});
			if (!patches) {
				return;
			}

			editor.timeline.updateKeyframeCurves({
				keyframes: patches.map(({ keyframeId, patch }) => ({
					trackId: state.trackId,
					elementId: state.elementId,
					propertyPath: state.propertyPath,
					componentKey: state.context.componentKey,
					keyframeId,
					patch,
				})),
			});
			hasPreviewRef.current = false;
		},
		[editor, state],
	);

	return {
		open,
		onOpenChange: handleOpenChange,
		canOpen: state.status === "ready",
		tooltip: state.status === "ready" ? "Open graph editor" : state.message,
		state,
		onActiveComponentKeyChange: handleActiveComponentKeyChange,
		onPreviewValue: handlePreviewValue,
		onCommitValue: handleCommitValue,
		onCancelPreview: discardPreview,
	};
}

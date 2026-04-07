import {
	getCurveHandlesForNormalizedCubicBezier,
	getEditableScalarChannels,
	getNormalizedCubicBezierForScalarSegment,
	getScalarKeyframeContext,
	updateScalarKeyframeCurve,
} from "@/lib/animation";
import type {
	AnimationPath,
	ElementAnimations,
	NormalizedCubicBezier,
	ScalarCurveKeyframePatch,
	ScalarGraphKeyframeContext,
	SelectedKeyframeRef,
} from "@/lib/animation/types";
import type { SceneTracks, TimelineElement } from "@/lib/timeline";

const GRAPH_LINEAR_CURVE: NormalizedCubicBezier = [0, 0, 1, 1];
const FLAT_VALUE_EPSILON = 1e-6;
const LINEAR_CURVE_EPSILON = 1e-6;

export type GraphEditorUnavailableReason =
	| "no-keyframe-selected"
	| "multiple-keyframes-selected"
	| "selected-element-missing"
	| "selected-element-has-no-animations"
	| "selected-keyframe-has-no-scalar-channel"
	| "selected-keyframe-missing-on-channel"
	| "selected-keyframe-has-no-next-segment"
	| "selected-segment-is-hold"
	| "selected-segment-is-flat";

export interface GraphEditorComponentOption {
	key: string;
	label: string;
}

interface GraphEditorBaseSelectionState {
	componentOptions: GraphEditorComponentOption[];
	activeComponentKey: string | null;
	message: string;
}

export interface GraphEditorUnavailableState
	extends GraphEditorBaseSelectionState {
	status: "unavailable";
	reason: GraphEditorUnavailableReason;
}

export interface GraphEditorReadyState extends GraphEditorBaseSelectionState {
	status: "ready";
	trackId: string;
	elementId: string;
	propertyPath: SelectedKeyframeRef["propertyPath"];
	keyframeId: string;
	element: TimelineElement;
	context: ScalarGraphKeyframeContext;
	cubicBezier: NormalizedCubicBezier;
}

export type GraphEditorSelectionState =
	| GraphEditorUnavailableState
	| GraphEditorReadyState;

export interface GraphEditorCurvePatch {
	keyframeId: string;
	patch: ScalarCurveKeyframePatch;
}

function createUnavailableState({
	reason,
	message,
	componentOptions = [],
	activeComponentKey = null,
}: {
	reason: GraphEditorUnavailableReason;
	message: string;
	componentOptions?: GraphEditorComponentOption[];
	activeComponentKey?: string | null;
}): GraphEditorUnavailableState {
	return {
		status: "unavailable",
		reason,
		message,
		componentOptions,
		activeComponentKey,
	};
}

function findElementByKeyframe({
	tracks,
	keyframe,
}: {
	tracks: SceneTracks;
	keyframe: SelectedKeyframeRef;
}): { element: TimelineElement; trackId: string; elementId: string } | null {
	for (const track of [...tracks.overlay, tracks.main, ...tracks.audio]) {
		if (track.id !== keyframe.trackId) {
			continue;
		}

		const element = track.elements.find(
			(trackElement) => trackElement.id === keyframe.elementId,
		);
		if (!element) {
			return null;
		}

		return {
			element,
			trackId: track.id,
			elementId: element.id,
		};
	}

	return null;
}

function findKeyframeTime({
	animations,
	propertyPath,
	keyframeId,
}: {
	animations: ElementAnimations;
	propertyPath: AnimationPath;
	keyframeId: string;
}): number | null {
	const binding = animations.bindings[propertyPath];
	if (!binding) return null;

	for (const component of binding.components) {
		const channel = animations.channels[component.channelId];
		if (channel?.kind !== "scalar") continue;
		const key = channel.keys.find((k) => k.id === keyframeId);
		if (key !== undefined) return key.time;
	}

	return null;
}

function getComponentLabel({ componentKey }: { componentKey: string }): string {
	switch (componentKey) {
		case "value":
			return "Value";
		default:
			return componentKey.toUpperCase();
	}
}

function isFlatSegment({
	context,
}: {
	context: ScalarGraphKeyframeContext;
}): boolean {
	if (!context.nextKey) {
		return true;
	}

	return (
		Math.abs(context.nextKey.value - context.keyframe.value) <=
		FLAT_VALUE_EPSILON
	);
}

function isLinearCurve({
	cubicBezier,
}: {
	cubicBezier: NormalizedCubicBezier;
}): boolean {
	return (
		Math.abs(cubicBezier[0]) <= LINEAR_CURVE_EPSILON &&
		Math.abs(cubicBezier[1]) <= LINEAR_CURVE_EPSILON &&
		Math.abs(cubicBezier[2] - 1) <= LINEAR_CURVE_EPSILON &&
		Math.abs(cubicBezier[3] - 1) <= LINEAR_CURVE_EPSILON
	);
}

export function resolveGraphEditorSelectionState({
	tracks,
	selectedKeyframes,
	preferredComponentKey,
}: {
	tracks: SceneTracks;
	selectedKeyframes: SelectedKeyframeRef[];
	preferredComponentKey?: string | null;
}): GraphEditorSelectionState {
	if (selectedKeyframes.length === 0) {
		return createUnavailableState({
			reason: "no-keyframe-selected",
			message: "Select a keyframe to edit its curve.",
		});
	}

	if (selectedKeyframes.length > 2) {
		return createUnavailableState({
			reason: "multiple-keyframes-selected",
			message: "Select one or two adjacent keyframes to edit a curve.",
		});
	}

	if (selectedKeyframes.length === 2) {
		const [firstKeyframe, secondKeyframe] = selectedKeyframes;
		if (
			firstKeyframe.trackId !== secondKeyframe.trackId ||
			firstKeyframe.elementId !== secondKeyframe.elementId ||
			firstKeyframe.propertyPath !== secondKeyframe.propertyPath
		) {
			return createUnavailableState({
				reason: "multiple-keyframes-selected",
				message: "Selected keyframes must be on the same element and property.",
			});
		}
	}

	const primaryKeyframe = selectedKeyframes[0];
	const secondaryKeyframeId =
		selectedKeyframes.length === 2 ? selectedKeyframes[1].keyframeId : null;

	const selectedElement = findElementByKeyframe({
		tracks,
		keyframe: primaryKeyframe,
	});
	if (!selectedElement) {
		return createUnavailableState({
			reason: "selected-element-missing",
			message: "The selected keyframe could not be resolved.",
		});
	}

	if (!selectedElement.element.animations) {
		return createUnavailableState({
			reason: "selected-element-has-no-animations",
			message: "The selected keyframe has no editable graph.",
		});
	}

	const scalarChannels = getEditableScalarChannels({
		animations: selectedElement.element.animations,
		propertyPath: primaryKeyframe.propertyPath,
	});
	if (scalarChannels.length === 0) {
		return createUnavailableState({
			reason: "selected-keyframe-has-no-scalar-channel",
			message: "The selected keyframe has no editable graph channel.",
		});
	}

	// When 2 keyframes are selected, resolve the earlier one as the outgoing-segment
	// anchor so the graph editor edits the curve between the two selected keyframes.
	let resolvedKeyframeId = primaryKeyframe.keyframeId;
	if (secondaryKeyframeId !== null) {
		const time1 = findKeyframeTime({
			animations: selectedElement.element.animations,
			propertyPath: primaryKeyframe.propertyPath,
			keyframeId: primaryKeyframe.keyframeId,
		});
		const time2 = findKeyframeTime({
			animations: selectedElement.element.animations,
			propertyPath: primaryKeyframe.propertyPath,
			keyframeId: secondaryKeyframeId,
		});
		if (time2 !== null && (time1 === null || time2 < time1)) {
			resolvedKeyframeId = secondaryKeyframeId;
		}
	}

	const contexts = scalarChannels.flatMap((channel) => {
		const context = getScalarKeyframeContext({
			animations: selectedElement.element.animations,
			propertyPath: primaryKeyframe.propertyPath,
			componentKey: channel.componentKey,
			keyframeId: resolvedKeyframeId,
		});
		if (!context) {
			return [];
		}

		return [
			{
				context,
				option: {
					key: channel.componentKey,
					label: getComponentLabel({ componentKey: channel.componentKey }),
				},
			},
		];
	});

	if (contexts.length === 0) {
		return createUnavailableState({
			reason: "selected-keyframe-missing-on-channel",
			message: "The selected keyframe is not editable as a graph segment.",
		});
	}

	const nextSegmentContexts = contexts.filter(
		({ context }) => context.nextKey !== null,
	);
	const preferredContext =
		contexts.find(({ option }) => option.key === preferredComponentKey) ?? null;
	const activeContext =
		preferredContext ?? nextSegmentContexts[0] ?? contexts[0];
	const componentOptions = contexts.map(({ option }) => option);

	if (!activeContext.context.nextKey) {
		return createUnavailableState({
			reason: "selected-keyframe-has-no-next-segment",
			message: "Select a keyframe that has an outgoing segment.",
			componentOptions,
			activeComponentKey: activeContext.option.key,
		});
	}

	if (isFlatSegment({ context: activeContext.context })) {
		return createUnavailableState({
			reason: "selected-segment-is-flat",
			message: "Flat segments are not graph-editable in this popover yet.",
			componentOptions,
			activeComponentKey: activeContext.option.key,
		});
	}

	if (activeContext.context.keyframe.segmentToNext === "step") {
		return createUnavailableState({
			reason: "selected-segment-is-hold",
			message: "Hold segments are not graph-editable in this popover yet.",
			componentOptions,
			activeComponentKey: activeContext.option.key,
		});
	}

	const cubicBezier =
		activeContext.context.keyframe.segmentToNext === "linear"
			? GRAPH_LINEAR_CURVE
			: getNormalizedCubicBezierForScalarSegment({
					leftKey: activeContext.context.keyframe,
					rightKey: activeContext.context.nextKey,
				});
	if (!cubicBezier) {
		return createUnavailableState({
			reason: "selected-segment-is-flat",
			message: "The selected segment cannot be represented in this graph view.",
			componentOptions,
			activeComponentKey: activeContext.option.key,
		});
	}

	return {
		status: "ready",
		message: "Edit graph",
		componentOptions,
		activeComponentKey: activeContext.option.key,
		trackId: selectedElement.trackId,
		elementId: selectedElement.elementId,
		propertyPath: primaryKeyframe.propertyPath,
		keyframeId: resolvedKeyframeId,
		element: selectedElement.element,
		context: activeContext.context,
		cubicBezier,
	};
}

export function buildGraphEditorCurvePatches({
	context,
	cubicBezier,
}: {
	context: ScalarGraphKeyframeContext;
	cubicBezier: NormalizedCubicBezier;
}): GraphEditorCurvePatch[] | null {
	if (!context.nextKey) {
		return null;
	}

	if (isLinearCurve({ cubicBezier })) {
		return [
			{
				keyframeId: context.keyframe.id,
				patch: {
					segmentToNext: "linear",
					rightHandle: null,
				},
			},
			{
				keyframeId: context.nextKey.id,
				patch: {
					leftHandle: null,
				},
			},
		];
	}

	const handles = getCurveHandlesForNormalizedCubicBezier({
		leftKey: context.keyframe,
		rightKey: context.nextKey,
		cubicBezier,
	});
	if (!handles) {
		return null;
	}

	return [
		{
			keyframeId: context.keyframe.id,
			patch: {
				segmentToNext: "bezier",
				rightHandle: handles.rightHandle,
			},
		},
		{
			keyframeId: context.nextKey.id,
			patch: {
				leftHandle: handles.leftHandle,
			},
		},
	];
}

export function applyGraphEditorCurvePreview({
	animations,
	context,
	cubicBezier,
}: {
	animations: ElementAnimations | undefined;
	context: ScalarGraphKeyframeContext;
	cubicBezier: NormalizedCubicBezier;
}): ElementAnimations | undefined {
	const patches = buildGraphEditorCurvePatches({
		context,
		cubicBezier,
	});
	if (!patches) {
		return animations;
	}

	return patches.reduce<ElementAnimations | undefined>(
		(nextAnimations, { keyframeId, patch }) =>
			updateScalarKeyframeCurve({
				animations: nextAnimations,
				propertyPath: context.propertyPath,
				componentKey: context.componentKey,
				keyframeId,
				patch,
			}),
		animations,
	);
}

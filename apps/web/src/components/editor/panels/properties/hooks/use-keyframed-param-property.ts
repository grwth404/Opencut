"use client";

import { useEditor } from "@/editor/use-editor";
import {
	buildGraphicParamPath,
	getKeyframeAtTime,
	hasKeyframesForPath,
	upsertPathKeyframe,
} from "@/animation";
import type {
	ElementAnimations,
} from "@/animation/types";
import {
	coerceAnimationParamValue,
	getAnimationParamDefaultInterpolation,
	getAnimationParamValueKind,
} from "@/animation/animated-params";
import type { ParamDefinition } from "@/params";
import type { TimelineElement } from "@/timeline";
import type { MediaTime } from "@/wasm";

export interface KeyframedParamPropertyResult {
	hasAnimatedKeyframes: boolean;
	isKeyframedAtTime: boolean;
	keyframeIdAtTime: string | null;
	onPreview: (value: number | string | boolean) => void;
	onCommit: () => void;
	toggleKeyframe: () => void;
}

export function useKeyframedParamProperty({
	param,
	trackId,
	elementId,
	animations,
	localTime,
	isPlayheadWithinElementRange,
	resolvedValue,
	buildBaseUpdates,
}: {
	param: ParamDefinition;
	trackId: string;
	elementId: string;
	animations: ElementAnimations | undefined;
	localTime: MediaTime;
	isPlayheadWithinElementRange: boolean;
	resolvedValue: number | string | boolean;
	buildBaseUpdates: ({
		value,
	}: {
		value: number | string | boolean;
	}) => Partial<TimelineElement>;
}): KeyframedParamPropertyResult {
	const editor = useEditor();
	const propertyPath = buildGraphicParamPath({ paramKey: param.key });
	const hasAnimatedKeyframes = hasKeyframesForPath({
		animations,
		propertyPath,
	});
	const keyframeAtTime = isPlayheadWithinElementRange
		? getKeyframeAtTime({
				animations,
				propertyPath,
				time: localTime,
			})
		: null;
	const keyframeIdAtTime = keyframeAtTime?.id ?? null;
	const isKeyframedAtTime = keyframeAtTime !== null;
	const shouldUseAnimatedChannel =
		hasAnimatedKeyframes && isPlayheadWithinElementRange;

	const previewValue: KeyframedParamPropertyResult["onPreview"] = (value) => {
		if (shouldUseAnimatedChannel) {
			editor.timeline.previewElements({
				updates: [
					{
						trackId,
						elementId,
						updates: {
							animations: upsertPathKeyframe({
								animations,
								propertyPath,
								time: localTime,
								value,
								kind: getAnimationParamValueKind({ param }),
								defaultInterpolation: getAnimationParamDefaultInterpolation({
									param,
								}),
								coerceValue: ({ value: nextValue }) =>
									coerceAnimationParamValue({
										param,
										value: nextValue,
									}),
							}),
						},
					},
				],
			});
			return;
		}

		editor.timeline.previewElements({
			updates: [
				{
					trackId,
					elementId,
					updates: buildBaseUpdates({ value }),
				},
			],
		});
	};

	const toggleKeyframe = () => {
		if (!isPlayheadWithinElementRange) {
			return;
		}

		if (keyframeIdAtTime) {
			editor.timeline.removeKeyframes({
				keyframes: [
					{
						trackId,
						elementId,
						propertyPath,
						keyframeId: keyframeIdAtTime,
					},
				],
			});
			return;
		}

		editor.timeline.upsertKeyframes({
			keyframes: [
				{
					trackId,
					elementId,
					propertyPath,
					time: localTime,
					value: resolvedValue,
				},
			],
		});
	};

	return {
		hasAnimatedKeyframes,
		isKeyframedAtTime,
		keyframeIdAtTime,
		onPreview: previewValue,
		onCommit: () => editor.timeline.commitPreview(),
		toggleKeyframe,
	};
}

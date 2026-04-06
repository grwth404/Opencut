import { useEditor } from "@/hooks/use-editor";
import {
	getKeyframeAtTime,
	hasKeyframesForPath,
	upsertElementKeyframe,
} from "@/lib/animation";
import type { AnimationPropertyPath, ElementAnimations } from "@/lib/animation/types";
import type { TimelineElement } from "@/lib/timeline";
import { snapToStep } from "@/utils/math";
import { usePropertyDraft } from "./use-property-draft";

export function useKeyframedNumberProperty({
	trackId,
	elementId,
	animations,
	propertyPath,
	localTime,
	isPlayheadWithinElementRange,
	displayValue,
	parse,
	valueAtPlayhead,
	step,
	buildBaseUpdates,
	buildAdditionalKeyframes,
}: {
	trackId: string;
	elementId: string;
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPropertyPath;
	localTime: number;
	isPlayheadWithinElementRange: boolean;
	displayValue: string;
	parse: (input: string) => number | null;
	valueAtPlayhead: number;
	step?: number;
	buildBaseUpdates: ({ value }: { value: number }) => Partial<TimelineElement>;
	buildAdditionalKeyframes?: ({
		value,
	}: { value: number }) => Array<{ propertyPath: AnimationPropertyPath; value: number }>;
}) {
	const editor = useEditor();
	const snapValue = (value: number) =>
		step != null ? snapToStep({ value, step }) : value;

	const hasAnimatedKeyframes = hasKeyframesForPath({ animations, propertyPath });
	const keyframeAtTime = isPlayheadWithinElementRange
		? getKeyframeAtTime({ animations, propertyPath, time: localTime })
		: null;
	const keyframeIdAtTime = keyframeAtTime?.id ?? null;
	const isKeyframedAtTime = keyframeAtTime !== null;
	const shouldUseAnimatedChannel =
		hasAnimatedKeyframes && isPlayheadWithinElementRange;

	const previewValue = ({ value }: { value: number }) => {
		const nextValue = snapValue(value);
		if (shouldUseAnimatedChannel) {
			const additionalKeyframes = buildAdditionalKeyframes?.({ value: nextValue }) ?? [];
			const updatedAnimations = [
				{ propertyPath, value: nextValue },
				...additionalKeyframes,
			].reduce(
				(currentAnimations, keyframe) =>
					upsertElementKeyframe({
						animations: currentAnimations,
						propertyPath: keyframe.propertyPath,
						time: localTime,
						value: keyframe.value,
					}),
				animations,
			);
			editor.timeline.previewElements({
				updates: [
					{
						trackId,
						elementId,
						updates: { animations: updatedAnimations },
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
					updates: buildBaseUpdates({ value: nextValue }),
				},
			],
		});
	};

	const propertyDraft = usePropertyDraft({
		displayValue,
		parse: (input) => {
			const parsedValue = parse(input);
			return parsedValue === null ? null : snapValue(parsedValue);
		},
		onPreview: (value) => previewValue({ value }),
		onCommit: () => editor.timeline.commitPreview(),
	});

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
					value: snapValue(valueAtPlayhead),
				},
			],
		});
	};

	const commitValue = ({ value }: { value: number }) => {
		const nextValue = snapValue(value);
		if (shouldUseAnimatedChannel) {
			const additionalKeyframes = buildAdditionalKeyframes?.({ value: nextValue }) ?? [];
			editor.timeline.upsertKeyframes({
				keyframes: [
					{ trackId, elementId, propertyPath, time: localTime, value: nextValue },
					...additionalKeyframes.map((keyframe) => ({
						trackId,
						elementId,
						propertyPath: keyframe.propertyPath,
						time: localTime,
						value: keyframe.value,
					})),
				],
			});
			return;
		}

		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId,
					patch: buildBaseUpdates({ value: nextValue }),
				},
			],
		});
	};

	return {
		...propertyDraft,
		hasAnimatedKeyframes,
		isKeyframedAtTime,
		keyframeIdAtTime,
		toggleKeyframe,
		commitValue,
	};
}

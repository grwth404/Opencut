import { useEditor } from "@/hooks/use-editor";
import {
	getKeyframeAtTime,
	hasKeyframesForPath,
	upsertElementKeyframe,
} from "@/lib/animation";
import type {
	AnimationPropertyPath,
	ElementAnimations,
	VectorValue,
} from "@/lib/animation/types";
import type { TimelineElement } from "@/lib/timeline";
import { snapToStep } from "@/utils/math";
import { usePropertyDraft } from "./use-property-draft";

export function useKeyframedVectorProperty({
	trackId,
	elementId,
	animations,
	propertyPath,
	localTime,
	isPlayheadWithinElementRange,
	resolvedValue,
	displayX,
	displayY,
	parseComponent,
	step,
	buildBaseUpdates,
}: {
	trackId: string;
	elementId: string;
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPropertyPath;
	localTime: number;
	isPlayheadWithinElementRange: boolean;
	resolvedValue: VectorValue;
	displayX: string;
	displayY: string;
	parseComponent: (input: string) => number | null;
	step?: number;
	buildBaseUpdates: ({
		value,
	}: {
		value: VectorValue;
	}) => Partial<TimelineElement>;
}) {
	const editor = useEditor();
	const snapComponentValue = (value: number) =>
		step != null ? snapToStep({ value, step }) : value;

	const hasAnimatedKeyframes = hasKeyframesForPath({
		animations,
		propertyPath,
	});
	const keyframeAtTime = isPlayheadWithinElementRange
		? getKeyframeAtTime({ animations, propertyPath, time: localTime })
		: null;
	const keyframeIdAtTime = keyframeAtTime?.id ?? null;
	const isKeyframedAtTime = keyframeAtTime !== null;
	const shouldUseAnimatedChannel =
		hasAnimatedKeyframes && isPlayheadWithinElementRange;

	const previewVector = ({ value }: { value: VectorValue }) => {
		const nextValue = {
			x: snapComponentValue(value.x),
			y: snapComponentValue(value.y),
		};
		if (shouldUseAnimatedChannel) {
			editor.timeline.previewElements({
				updates: [
					{
						trackId,
						elementId,
						updates: {
							animations: upsertElementKeyframe({
								animations,
								propertyPath,
								time: localTime,
								value: nextValue,
							}),
						},
					},
				],
			});
			return;
		}

		editor.timeline.previewElements({
			updates: [{ trackId, elementId, updates: buildBaseUpdates({ value: nextValue }) }],
		});
	};

	const x = usePropertyDraft({
		displayValue: displayX,
		parse: (input) => {
			const parsedValue = parseComponent(input);
			return parsedValue === null ? null : snapComponentValue(parsedValue);
		},
		onPreview: (xVal) =>
			previewVector({ value: { x: xVal, y: resolvedValue.y } }),
		onCommit: () => editor.timeline.commitPreview(),
	});

	const y = usePropertyDraft({
		displayValue: displayY,
		parse: (input) => {
			const parsedValue = parseComponent(input);
			return parsedValue === null ? null : snapComponentValue(parsedValue);
		},
		onPreview: (yVal) =>
			previewVector({ value: { x: resolvedValue.x, y: yVal } }),
		onCommit: () => editor.timeline.commitPreview(),
	});

	const toggleKeyframe = () => {
		if (!isPlayheadWithinElementRange) return;

		if (keyframeIdAtTime) {
			editor.timeline.removeKeyframes({
				keyframes: [
					{ trackId, elementId, propertyPath, keyframeId: keyframeIdAtTime },
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

	const commitX = ({ value }: { value: number }) => {
		const vector: VectorValue = {
			x: snapComponentValue(value),
			y: snapComponentValue(resolvedValue.y),
		};
		if (shouldUseAnimatedChannel) {
			editor.timeline.upsertKeyframes({
				keyframes: [
					{ trackId, elementId, propertyPath, time: localTime, value: vector },
				],
			});
			return;
		}
		editor.timeline.updateElements({
			updates: [
				{ trackId, elementId, updates: buildBaseUpdates({ value: vector }) },
			],
		});
	};

	const commitY = ({ value }: { value: number }) => {
		const vector: VectorValue = {
			x: snapComponentValue(resolvedValue.x),
			y: snapComponentValue(value),
		};
		if (shouldUseAnimatedChannel) {
			editor.timeline.upsertKeyframes({
				keyframes: [
					{ trackId, elementId, propertyPath, time: localTime, value: vector },
				],
			});
			return;
		}
		editor.timeline.updateElements({
			updates: [
				{ trackId, elementId, updates: buildBaseUpdates({ value: vector }) },
			],
		});
	};

	return {
		x,
		y,
		hasAnimatedKeyframes,
		isKeyframedAtTime,
		keyframeIdAtTime,
		toggleKeyframe,
		commitX,
		commitY,
	};
}

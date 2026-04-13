import { getKeyframeById } from "@/lib/animation";
import type { SelectedKeyframeRef } from "@/lib/animation/types";
import type { TimelineElement } from "@/lib/timeline";
import { PasteKeyframesCommand } from "@/lib/commands/timeline";
import type {
	ClipboardHandler,
	KeyframeClipboardCurvePatch,
	KeyframeClipboardItem,
} from "../types";

function resolveSingleSourceElement({
	selectedKeyframes,
}: {
	selectedKeyframes: SelectedKeyframeRef[];
}) {
	const firstKeyframe = selectedKeyframes[0];
	if (!firstKeyframe) {
		return null;
	}

	const sourceElement = {
		trackId: firstKeyframe.trackId,
		elementId: firstKeyframe.elementId,
	};
	const isSingleSource = selectedKeyframes.every(
		(keyframe) =>
			keyframe.trackId === sourceElement.trackId &&
			keyframe.elementId === sourceElement.elementId,
	);

	return isSingleSource ? sourceElement : null;
}

function getCurvePatches({
	element,
	propertyPath,
	keyframeId,
}: {
	element: TimelineElement;
	propertyPath: KeyframeClipboardItem["propertyPath"];
	keyframeId: string;
}): KeyframeClipboardCurvePatch[] {
	const binding = element.animations?.bindings[propertyPath];
	if (!binding) {
		return [];
	}

	return binding.components.flatMap((component) => {
		const channel = element.animations?.channels[component.channelId];
		if (channel?.kind !== "scalar") {
			return [];
		}

		const keyframe = channel.keys.find(
			(candidate) => candidate.id === keyframeId,
		);
		if (!keyframe) {
			return [];
		}

		return [
			{
				componentKey: component.key,
				patch: {
					leftHandle: keyframe.leftHandle ?? null,
					rightHandle: keyframe.rightHandle ?? null,
					segmentToNext: keyframe.segmentToNext,
					tangentMode: keyframe.tangentMode,
				},
			},
		];
	});
}

function buildClipboardItem({
	element,
	propertyPath,
	keyframeId,
}: {
	element: TimelineElement;
	propertyPath: KeyframeClipboardItem["propertyPath"];
	keyframeId: string;
}): (Omit<KeyframeClipboardItem, "timeOffset"> & { time: number }) | null {
	const keyframe = getKeyframeById({
		animations: element.animations,
		propertyPath,
		keyframeId,
	});
	if (!keyframe) {
		return null;
	}

	return {
		propertyPath,
		time: keyframe.time,
		value: keyframe.value,
		interpolation: keyframe.interpolation,
		curvePatches: getCurvePatches({
			element,
			propertyPath,
			keyframeId,
		}),
	};
}

export const KeyframesClipboardHandler = {
	type: "keyframes",

	canCopy({ selectedKeyframes }) {
		return selectedKeyframes.length > 0;
	},

	copy({ editor, selectedKeyframes }) {
		const sourceElement = resolveSingleSourceElement({ selectedKeyframes });
		if (!sourceElement) {
			return null;
		}

		const [result] = editor.timeline.getElementsWithTracks({
			elements: [sourceElement],
		});
		if (!result) {
			return null;
		}

		const rawItems = selectedKeyframes.flatMap((keyframeRef) => {
			const item = buildClipboardItem({
				element: result.element,
				propertyPath: keyframeRef.propertyPath,
				keyframeId: keyframeRef.keyframeId,
			});
			return item ? [item] : [];
		});
		if (rawItems.length === 0) {
			return null;
		}

		const minTime = Math.min(...rawItems.map((item) => item.time));
		const items = rawItems
			.map(({ time, ...item }) => ({
				...item,
				timeOffset: time - minTime,
			}))
			.sort(
				(left, right) =>
					left.timeOffset - right.timeOffset ||
					left.propertyPath.localeCompare(right.propertyPath),
			);

		return {
			type: "keyframes",
			sourceElement,
			items,
		};
	},

	paste(entry, { selectedElements, time }) {
		const targetElement = selectedElements[0];
		if (!targetElement || entry.items.length === 0) {
			return null;
		}

		return new PasteKeyframesCommand({
			trackId: targetElement.trackId,
			elementId: targetElement.elementId,
			time,
			clipboardItems: entry.items,
		});
	},
} satisfies ClipboardHandler<"keyframes">;

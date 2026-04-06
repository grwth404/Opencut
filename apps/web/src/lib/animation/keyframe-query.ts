import type {
	AnimationBindingInstance,
	AnimationChannel,
	AnimationPath,
	ElementAnimations,
	ElementKeyframe,
} from "@/lib/animation/types";
import {
	type AnimationComponentValue,
	composeAnimationValue,
} from "./binding-values";
import {
	getChannelValueAtTime,
	getScalarSegmentInterpolation,
} from "./interpolation";
import { isAnimationPath } from "./target-resolver";

function getBindingFallbackValue({
	channel,
}: {
	channel: ElementAnimations["channels"][string];
}) {
	if (!channel || channel.keys.length === 0) {
		return channel?.kind === "discrete" ? false : 0;
	}

	return channel.keys[0].value;
}

interface BindingKeyframeMatch {
	componentIndex: number;
	channel: AnimationChannel;
	keyframe: AnimationChannel["keys"][number];
}

function getBindingKeyframeMatches({
	animations,
	binding,
}: {
	animations: ElementAnimations;
	binding: AnimationBindingInstance;
}): BindingKeyframeMatch[] {
	return binding.components.flatMap((component, componentIndex) => {
		const channel = animations.channels[component.channelId];
		if (!channel || channel.keys.length === 0) {
			return [];
		}

		return channel.keys.map((keyframe) => ({
			componentIndex,
			channel,
			keyframe,
		}));
	});
}

function getUniqueBindingKeyframeMatches({
	animations,
	binding,
}: {
	animations: ElementAnimations;
	binding: AnimationBindingInstance;
}): BindingKeyframeMatch[] {
	const sortedMatches = getBindingKeyframeMatches({
		animations,
		binding,
	}).sort(
		(leftMatch, rightMatch) =>
			leftMatch.keyframe.time - rightMatch.keyframe.time ||
			leftMatch.componentIndex - rightMatch.componentIndex,
	);
	const uniqueMatches: BindingKeyframeMatch[] = [];

	for (const match of sortedMatches) {
		const previousMatch = uniqueMatches[uniqueMatches.length - 1];
		if (
			!previousMatch ||
			previousMatch.keyframe.time !== match.keyframe.time
		) {
			uniqueMatches.push(match);
			continue;
		}

		if (
			previousMatch.componentIndex !== 0 &&
			match.componentIndex === 0
		) {
			uniqueMatches[uniqueMatches.length - 1] = match;
		}
	}

	return uniqueMatches;
}

function getPreferredBindingKeyframeMatch({
	matches,
}: {
	matches: BindingKeyframeMatch[];
}): BindingKeyframeMatch | null {
	return (
		matches.find((match) => match.componentIndex === 0) ??
		matches[0] ??
		null
	);
}

function getComposedBindingValueAtTime({
	animations,
	binding,
	time,
}: {
	animations: ElementAnimations;
	binding: AnimationBindingInstance;
	time: number;
}) {
	const componentValues = Object.fromEntries(
		binding.components.map((component) => {
			const channel = animations.channels[component.channelId];
			return [
				component.key,
				getChannelValueAtTime({
					channel,
					time,
					fallbackValue: getBindingFallbackValue({ channel }),
				}),
			];
		}),
	) as Record<string, AnimationComponentValue | undefined>;

	return composeAnimationValue({
		binding,
		componentValues,
	});
}

function getKeyframeInterpolation({
	channel,
	keyframe,
}: {
	channel: AnimationChannel;
	keyframe: AnimationChannel["keys"][number];
}) {
	return channel.kind === "scalar" && "segmentToNext" in keyframe
		? getScalarSegmentInterpolation({ segment: keyframe.segmentToNext })
		: "hold";
}

function toElementKeyframe({
	animations,
	binding,
	propertyPath,
	keyframeMatch,
}: {
	animations: ElementAnimations;
	binding: AnimationBindingInstance;
	propertyPath: AnimationPath;
	keyframeMatch: BindingKeyframeMatch;
}): ElementKeyframe | null {
	const value = getComposedBindingValueAtTime({
		animations,
		binding,
		time: keyframeMatch.keyframe.time,
	});
	if (value === null) {
		return null;
	}

	return {
		propertyPath,
		id: keyframeMatch.keyframe.id,
		time: keyframeMatch.keyframe.time,
		value,
		interpolation: getKeyframeInterpolation({
			channel: keyframeMatch.channel,
			keyframe: keyframeMatch.keyframe,
		}),
	};
}

export function getElementKeyframes({
	animations,
}: {
	animations: ElementAnimations | undefined;
}): ElementKeyframe[] {
	if (!animations) {
		return [];
	}

	return Object.entries(animations.bindings).flatMap(
		([propertyPath, binding]) => {
			if (!binding || !isAnimationPath(propertyPath)) {
				return [];
			}

			return getUniqueBindingKeyframeMatches({
				animations,
				binding,
			}).flatMap((keyframeMatch) => {
				const keyframe = toElementKeyframe({
					animations,
					binding,
					propertyPath,
					keyframeMatch,
				});
				if (!keyframe) {
					return [];
				}

				return [keyframe];
			});
		},
	);
}

export function hasKeyframesForPath({
	animations,
	propertyPath,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
}): boolean {
	const binding = animations?.bindings[propertyPath];
	if (!binding) {
		return false;
	}

	return binding.components.some((component) =>
		Boolean(animations?.channels[component.channelId]?.keys.length),
	);
}

export function getKeyframeAtTime({
	animations,
	propertyPath,
	time,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
	time: number;
}): ElementKeyframe | null {
	const binding = animations?.bindings[propertyPath];
	if (!binding) {
		return null;
	}

	const keyframeMatch = getPreferredBindingKeyframeMatch({
		matches: getBindingKeyframeMatches({
			animations,
			binding,
		}).filter(({ keyframe }) => keyframe.time === time),
	});
	if (!keyframeMatch) {
		return null;
	}

	return toElementKeyframe({
		animations,
		binding,
		propertyPath,
		keyframeMatch,
	});
}

export function getKeyframeById({
	animations,
	propertyPath,
	keyframeId,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
	keyframeId: string;
}): ElementKeyframe | null {
	const binding = animations?.bindings[propertyPath];
	if (!binding) {
		return null;
	}

	const keyframeMatch = getPreferredBindingKeyframeMatch({
		matches: getBindingKeyframeMatches({
			animations,
			binding,
		}).filter(({ keyframe }) => keyframe.id === keyframeId),
	});
	if (!keyframeMatch) {
		return null;
	}

	return toElementKeyframe({
		animations,
		binding,
		propertyPath,
		keyframeMatch,
	});
}

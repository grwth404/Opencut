import type {
	AnimationPath,
	AnimationValueForPath,
	ElementAnimations,
} from "@/animation/types";
import {
	type AnimationComponentValue,
	composeAnimationValue,
	decomposeAnimationValue,
} from "./binding-values";
import {
	getChannelValueAtTime,
} from "./interpolation";

export function getElementLocalTime({
	timelineTime,
	elementStartTime,
	elementDuration,
}: {
	timelineTime: number;
	elementStartTime: number;
	elementDuration: number;
}): number {
	const localTime = timelineTime - elementStartTime;
	if (localTime <= 0) {
		return 0;
	}

	if (localTime >= elementDuration) {
		return elementDuration;
	}

	return localTime;
}

export function resolveAnimationPathValueAtTime<TPath extends AnimationPath>({
	animations,
	propertyPath,
	localTime,
	fallbackValue,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: TPath;
	localTime: number;
	fallbackValue: AnimationValueForPath<TPath>;
}): AnimationValueForPath<TPath> {
	const binding = animations?.bindings[propertyPath];
	if (!binding) {
		return fallbackValue;
	}

	const fallbackComponents = decomposeAnimationValue({
		kind: binding.kind,
		value: fallbackValue,
	});
	if (!fallbackComponents) {
		return fallbackValue;
	}

	const componentValues = Object.fromEntries(
		binding.components.map((component) => {
			const channel = animations?.channels[component.channelId];
			return [
				component.key,
				getChannelValueAtTime({
					channel,
					time: localTime,
					fallbackValue:
						fallbackComponents[component.key] ??
						(channel?.kind === "discrete" ? false : 0),
				}),
			];
		}),
	) as Record<string, AnimationComponentValue | undefined>;
	return (composeAnimationValue({
		binding,
		componentValues,
	}) ?? fallbackValue) as AnimationValueForPath<TPath>;
}

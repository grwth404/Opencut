import type {
	AnimationColorPropertyPath,
	AnimationNumericPropertyPath,
	AnimationPath,
	AnimationPropertyPath,
	AnimationValueForPath,
	ElementAnimations,
} from "@/lib/animation/types";
import type { Transform } from "@/lib/rendering";
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

export function resolveTransformAtTime({
	baseTransform,
	animations,
	localTime,
}: {
	baseTransform: Transform;
	animations: ElementAnimations | undefined;
	localTime: number;
}): Transform {
	const safeLocalTime = Math.max(0, localTime);
	return {
		position: resolveAnimationPathValueAtTime({
			animations,
			propertyPath: "transform.position",
			localTime: safeLocalTime,
			fallbackValue: baseTransform.position,
		}),
		scaleX: resolveAnimationPathValueAtTime({
			animations,
			propertyPath: "transform.scaleX",
			localTime: safeLocalTime,
			fallbackValue: baseTransform.scaleX,
		}),
		scaleY: resolveAnimationPathValueAtTime({
			animations,
			propertyPath: "transform.scaleY",
			localTime: safeLocalTime,
			fallbackValue: baseTransform.scaleY,
		}),
		rotate: resolveAnimationPathValueAtTime({
			animations,
			propertyPath: "transform.rotate",
			localTime: safeLocalTime,
			fallbackValue: baseTransform.rotate,
		}),
	};
}

export function resolveOpacityAtTime({
	baseOpacity,
	animations,
	localTime,
}: {
	baseOpacity: number;
	animations: ElementAnimations | undefined;
	localTime: number;
}): number {
	return resolveAnimationPathValueAtTime({
		animations,
		propertyPath: "opacity",
		localTime: Math.max(0, localTime),
		fallbackValue: baseOpacity,
	});
}

export function resolveNumberAtTime({
	baseValue,
	animations,
	propertyPath,
	localTime,
}: {
	baseValue: number;
	animations: ElementAnimations | undefined;
	propertyPath: AnimationNumericPropertyPath;
	localTime: number;
}): number {
	return resolveAnimationPathValueAtTime({
		animations,
		propertyPath,
		localTime: Math.max(0, localTime),
		fallbackValue: baseValue,
	});
}

export function resolveColorAtTime({
	baseColor,
	animations,
	propertyPath,
	localTime,
}: {
	baseColor: string;
	animations: ElementAnimations | undefined;
	propertyPath: AnimationColorPropertyPath;
	localTime: number;
}): string {
	return resolveAnimationPathValueAtTime({
		animations,
		propertyPath,
		localTime: Math.max(0, localTime),
		fallbackValue: baseColor,
	});
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

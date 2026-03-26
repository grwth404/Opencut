import type {
	AnimationPropertyPath,
	ElementAnimations,
} from "@/lib/animation/types";
import type { Transform } from "@/lib/rendering";
import {
	getColorValueAtTime,
	getNumberChannelValueAtTime,
	getVectorChannelValueAtTime,
} from "./interpolation";
import { getColorChannelForPath } from "./color-channel";
import { getNumberChannelForPath } from "./number-channel";
import { getVectorChannelForPath } from "./vector-channel";

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
		position: getVectorChannelValueAtTime({
			channel: getVectorChannelForPath({
				animations,
				propertyPath: "transform.position",
			}),
			time: safeLocalTime,
			fallbackValue: baseTransform.position,
		}),
		scaleX: getNumberChannelValueAtTime({
			channel: getNumberChannelForPath({
				animations,
				propertyPath: "transform.scaleX",
			}),
			time: safeLocalTime,
			fallbackValue: baseTransform.scaleX,
		}),
		scaleY: getNumberChannelValueAtTime({
			channel: getNumberChannelForPath({
				animations,
				propertyPath: "transform.scaleY",
			}),
			time: safeLocalTime,
			fallbackValue: baseTransform.scaleY,
		}),
		rotate: getNumberChannelValueAtTime({
			channel: getNumberChannelForPath({
				animations,
				propertyPath: "transform.rotate",
			}),
			time: safeLocalTime,
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
	return getNumberChannelValueAtTime({
		channel: getNumberChannelForPath({
			animations,
			propertyPath: "opacity",
		}),
		time: Math.max(0, localTime),
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
	propertyPath: AnimationPropertyPath;
	localTime: number;
}): number {
	return getNumberChannelValueAtTime({
		channel: getNumberChannelForPath({ animations, propertyPath }),
		time: Math.max(0, localTime),
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
	propertyPath: AnimationPropertyPath;
	localTime: number;
}): string {
	return getColorValueAtTime({
		channel: getColorChannelForPath({ animations, propertyPath }),
		time: Math.max(0, localTime),
		fallbackValue: baseColor,
	});
}

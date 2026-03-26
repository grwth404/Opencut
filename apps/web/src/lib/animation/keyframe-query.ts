import { TIME_EPSILON_SECONDS } from "@/constants/animation-constants";
import type {
	AnimationPath,
	ElementAnimations,
	ElementKeyframe,
} from "@/lib/animation/types";
import { isAnimationPath } from "./target-resolver";

export function getElementKeyframes({
	animations,
}: {
	animations: ElementAnimations | undefined;
}): ElementKeyframe[] {
	if (!animations) {
		return [];
	}

	return Object.entries(animations.channels).flatMap(
		([propertyPath, channel]) => {
			if (
				!channel ||
				channel.keyframes.length === 0 ||
				!isAnimationPath(propertyPath)
			) {
				return [];
			}

			return channel.keyframes.map((keyframe) => ({
				propertyPath,
				id: keyframe.id,
				time: keyframe.time,
				value: keyframe.value,
				interpolation: keyframe.interpolation,
			}));
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
	const channel = animations?.channels[propertyPath];
	return Boolean(channel && channel.keyframes.length > 0);
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
	const channel = animations?.channels[propertyPath];
	if (!channel || channel.keyframes.length === 0) return null;
	const keyframe = channel.keyframes.find(
		(keyframe) => Math.abs(keyframe.time - time) <= TIME_EPSILON_SECONDS,
	);
	if (!keyframe) return null;
	return {
		propertyPath,
		id: keyframe.id,
		time: keyframe.time,
		value: keyframe.value,
		interpolation: keyframe.interpolation,
	};
}

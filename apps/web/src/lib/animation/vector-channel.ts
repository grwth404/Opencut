import type {
	AnimationPropertyPath,
	ElementAnimations,
	VectorAnimationChannel,
	VectorValue,
} from "@/lib/animation/types";

export function isVectorValue(value: unknown): value is VectorValue {
	return (
		typeof value === "object" &&
		value !== null &&
		"x" in value &&
		"y" in value &&
		typeof (value as VectorValue).x === "number" &&
		typeof (value as VectorValue).y === "number"
	);
}

export function getVectorChannelForPath({
	animations,
	propertyPath,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPropertyPath;
}): VectorAnimationChannel | undefined {
	const channel = animations?.channels[propertyPath];
	if (!channel || channel.valueKind !== "vector") {
		return undefined;
	}
	return channel;
}

export function getVectorChannelValueAtTime({
	channel,
	time,
	fallbackValue,
}: {
	channel: VectorAnimationChannel | undefined;
	time: number;
	fallbackValue: VectorValue;
}): VectorValue {
	if (!channel || channel.keyframes.length === 0) {
		return fallbackValue;
	}

	const keyframes = [...channel.keyframes].sort((a, b) => a.time - b.time);
	const first = keyframes[0];
	const last = keyframes[keyframes.length - 1];

	if (!first || !last) return fallbackValue;
	if (time <= first.time) return first.value;
	if (time >= last.time) return last.value;

	for (let i = 0; i < keyframes.length - 1; i++) {
		const left = keyframes[i];
		const right = keyframes[i + 1];
		if (time < left.time || time > right.time) continue;

		if (left.interpolation === "hold") return left.value;

		const span = right.time - left.time;
		if (span === 0) return right.value;

		const t = (time - left.time) / span;
		return {
			x: left.value.x + (right.value.x - left.value.x) * t,
			y: left.value.y + (right.value.y - left.value.y) * t,
		};
	}

	return last.value;
}

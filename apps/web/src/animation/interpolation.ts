import type {
	AnimationChannel,
	AnimationInterpolation,
	AnimationValue,
	DiscreteAnimationChannel,
	DiscreteValue,
	ScalarAnimationChannel,
	ScalarAnimationKey,
	ScalarSegmentType,
} from "@/animation/types";
import { mediaTime } from "@/wasm";
import {
	getBezierPoint,
	getDefaultLeftHandle,
	getDefaultRightHandle,
	solveBezierProgressForTime,
} from "./bezier";
import { clamp } from "@/utils/math";

function byTimeAscending({
	leftTime,
	rightTime,
}: {
	leftTime: number;
	rightTime: number;
}): number {
	return leftTime - rightTime;
}

function isWithinTimePair({
	time,
	leftTime,
	rightTime,
}: {
	time: number;
	leftTime: number;
	rightTime: number;
}): boolean {
	return time >= leftTime && time <= rightTime;
}

function lerpNumber({
	leftValue,
	rightValue,
	progress,
}: {
	leftValue: number;
	rightValue: number;
	progress: number;
}): number {
	return leftValue + (rightValue - leftValue) * progress;
}

function normalizeRightHandle({
	handle,
	leftKey,
	rightKey,
}: {
	handle: ScalarAnimationKey["rightHandle"];
	leftKey: ScalarAnimationKey;
	rightKey: ScalarAnimationKey;
}) {
	if (!handle) {
		return undefined;
	}

	const span = mediaTime({
		ticks: Math.max(1, rightKey.time - leftKey.time),
	});
	return {
		dt: mediaTime({
			ticks: Math.min(span, Math.max(0, handle.dt)),
		}),
		dv: handle.dv,
	};
}

function normalizeLeftHandle({
	handle,
	leftKey,
	rightKey,
}: {
	handle: ScalarAnimationKey["leftHandle"];
	leftKey: ScalarAnimationKey;
	rightKey: ScalarAnimationKey;
}) {
	if (!handle) {
		return undefined;
	}

	const span = mediaTime({
		ticks: Math.max(1, rightKey.time - leftKey.time),
	});
	return {
		dt: mediaTime({
			ticks: Math.max(-span, Math.min(0, handle.dt)),
		}),
		dv: handle.dv,
	};
}

function normalizeScalarKey({
	key,
}: {
	key: ScalarAnimationKey;
}): ScalarAnimationKey {
	return {
		...key,
		tangentMode: key.tangentMode ?? "flat",
		segmentToNext: key.segmentToNext ?? "linear",
	};
}

function normalizeScalarChannel({
	channel,
}: {
	channel: ScalarAnimationChannel;
}): ScalarAnimationChannel {
	const sortedKeys = [...channel.keys]
		.map((key) => normalizeScalarKey({ key }))
		.sort((leftKey, rightKey) =>
			byTimeAscending({
				leftTime: leftKey.time,
				rightTime: rightKey.time,
			}),
		);
	const nextKeys = sortedKeys.map((key, index) => {
		const previousKey = sortedKeys[index - 1];
		const nextKey = sortedKeys[index + 1];
		return {
			...key,
			leftHandle:
				previousKey != null
					? normalizeLeftHandle({
							handle: key.leftHandle,
							leftKey: previousKey,
							rightKey: key,
						})
					: undefined,
			rightHandle:
				nextKey != null
					? normalizeRightHandle({
							handle: key.rightHandle,
							leftKey: key,
							rightKey: nextKey,
						})
					: undefined,
		};
	});

	return {
		...channel,
		keys: nextKeys,
	};
}

export function normalizeChannel<TChannel extends AnimationChannel>({
	channel,
}: {
	channel: TChannel;
}): TChannel {
	if (channel.kind === "scalar") {
		return normalizeScalarChannel({
			channel,
		}) as TChannel;
	}

	return {
		...channel,
		keys: [...channel.keys].sort((leftKeyframe, rightKeyframe) =>
			byTimeAscending({
				leftTime: leftKeyframe.time,
				rightTime: rightKeyframe.time,
			}),
		),
	} as TChannel;
}

function extrapolateScalarEdge({
	mode,
	edgeKey,
	neighborKey,
	time,
}: {
	mode: "hold" | "linear";
	edgeKey: ScalarAnimationKey;
	neighborKey: ScalarAnimationKey | undefined;
	time: number;
}) {
	if (mode === "hold" || !neighborKey) {
		return edgeKey.value;
	}

	const span = neighborKey.time - edgeKey.time;
	if (span === 0) {
		return edgeKey.value;
	}

	return edgeKey.value + ((time - edgeKey.time) / span) * (neighborKey.value - edgeKey.value);
}

export function getScalarSegmentInterpolation({
	segment,
}: {
	segment: ScalarSegmentType;
}): AnimationInterpolation {
	if (segment === "step") {
		return "hold";
	}

	return segment === "bezier" ? "bezier" : "linear";
}

export function getScalarChannelValueAtTime({
	channel,
	time,
	fallbackValue,
}: {
	channel: ScalarAnimationChannel | undefined;
	time: number;
	fallbackValue: number;
}): number {
	if (!channel || channel.keys.length === 0) {
		return fallbackValue;
	}

	const normalizedChannel = normalizeChannel({
		channel,
	});
	const firstKey = normalizedChannel.keys[0];
	const lastKey = normalizedChannel.keys[normalizedChannel.keys.length - 1];
	if (!firstKey || !lastKey) {
		return fallbackValue;
	}

	if (time <= firstKey.time) {
		if (time < firstKey.time) {
			return extrapolateScalarEdge({
				mode: normalizedChannel.extrapolation?.before ?? "hold",
				edgeKey: firstKey,
				neighborKey: normalizedChannel.keys[1],
				time,
			});
		}

		return firstKey.value;
	}

	if (time >= lastKey.time) {
		if (time > lastKey.time) {
			return extrapolateScalarEdge({
				mode: normalizedChannel.extrapolation?.after ?? "hold",
				edgeKey: lastKey,
				neighborKey: normalizedChannel.keys[normalizedChannel.keys.length - 2],
				time,
			});
		}

		return lastKey.value;
	}

	for (
		let keyIndex = 0;
		keyIndex < normalizedChannel.keys.length - 1;
		keyIndex++
	) {
		const leftKey = normalizedChannel.keys[keyIndex];
		const rightKey = normalizedChannel.keys[keyIndex + 1];
		if (time === rightKey.time) {
			return rightKey.value;
		}

		if (
			!isWithinTimePair({
				time,
				leftTime: leftKey.time,
				rightTime: rightKey.time,
			})
		) {
			continue;
		}

		if (leftKey.segmentToNext === "step") {
			return leftKey.value;
		}

		const span = rightKey.time - leftKey.time;
		if (span === 0) {
			return rightKey.value;
		}

		const progress = clamp({
			value: (time - leftKey.time) / span,
			min: 0,
			max: 1,
		});
		if (leftKey.segmentToNext === "linear") {
			return lerpNumber({
				leftValue: leftKey.value,
				rightValue: rightKey.value,
				progress,
			});
		}

		const curveProgress = solveBezierProgressForTime({
			time,
			leftKey,
			rightKey,
		});
		const rightHandle =
			leftKey.rightHandle ?? getDefaultRightHandle({ leftKey, rightKey });
		const leftHandle =
			rightKey.leftHandle ?? getDefaultLeftHandle({ leftKey, rightKey });
		return getBezierPoint({
			progress: curveProgress,
			p0: leftKey.value,
			p1: leftKey.value + rightHandle.dv,
			p2: rightKey.value + leftHandle.dv,
			p3: rightKey.value,
		});
	}

	return lastKey.value;
}

export function getDiscreteChannelValueAtTime({
	channel,
	time,
	fallbackValue,
}: {
	channel: DiscreteAnimationChannel | undefined;
	time: number;
	fallbackValue: DiscreteValue;
}): DiscreteValue {
	if (!channel || channel.keys.length === 0) {
		return fallbackValue;
	}

	const normalizedChannel = normalizeChannel({
		channel,
	});
	let currentValue = fallbackValue;
	for (const key of normalizedChannel.keys) {
		if (time < key.time) {
			break;
		}
		currentValue = key.value;
	}
	return currentValue;
}

export function getChannelValueAtTime({
	channel,
	time,
	fallbackValue,
}: {
	channel: AnimationChannel | undefined;
	time: number;
	fallbackValue: AnimationValue;
}): AnimationValue {
	if (!channel || channel.keys.length === 0) {
		return fallbackValue;
	}

	if (channel.kind === "scalar") {
		return typeof fallbackValue === "number"
			? getScalarChannelValueAtTime({
					channel,
					time,
					fallbackValue,
				})
			: fallbackValue;
	}

	if (typeof fallbackValue !== "string" && typeof fallbackValue !== "boolean") {
		return fallbackValue;
	}

	return getDiscreteChannelValueAtTime({
		channel,
		time,
		fallbackValue,
	});
}

import type {
	AnimationBindingInstance,
	AnimationBindingKind,
	AnimationChannel,
	AnimationInterpolation,
	AnimationPath,
	AnimationPropertyPath,
	AnimationValue,
	DiscreteAnimationChannel,
	DiscreteAnimationKey,
	ElementAnimations,
	ScalarAnimationChannel,
	ScalarAnimationKey,
	ScalarCurveKeyframePatch,
	ScalarSegmentType,
} from "@/animation/types";
import {
	cloneAnimationBinding,
	createAnimationBinding,
	decomposeAnimationValue,
} from "./binding-values";
import {
	getBezierPoint,
	getDefaultLeftHandle,
	getDefaultRightHandle,
	solveBezierProgressForTime,
} from "./bezier";
import {
	getChannelValueAtTime,
	getScalarSegmentInterpolation,
	normalizeChannel,
} from "./interpolation";
import {
	coerceAnimationValueForProperty,
	getAnimationPropertyDefinition,
} from "./property-registry";
import {
	type MediaTime,
	roundMediaTime,
	subMediaTime,
	ZERO_MEDIA_TIME,
} from "@/wasm";
import { generateUUID } from "@/utils/id";

function isNearlySameTime({
	leftTime,
	rightTime,
}: {
	leftTime: number;
	rightTime: number;
}): boolean {
	return leftTime === rightTime;
}

function hasChannelKeys({
	channel,
}: {
	channel: AnimationChannel | undefined;
}): boolean {
	return Boolean(channel && channel.keys.length > 0);
}

function toAnimation({
	animations,
}: {
	animations: ElementAnimations;
}): ElementAnimations | undefined {
	const nextBindings = Object.fromEntries(
		Object.entries(animations.bindings).filter(([, binding]) => binding),
	);
	const nextChannels = Object.fromEntries(
		Object.entries(animations.channels).filter(([, channel]) =>
			hasChannelKeys({ channel }),
		),
	);
	if (Object.keys(nextBindings).length === 0 || Object.keys(nextChannels).length === 0) {
		return undefined;
	}

	return {
		bindings: nextBindings,
		channels: nextChannels,
	};
}

function cloneAnimationsState({
	animations,
}: {
	animations: ElementAnimations | undefined;
}): ElementAnimations {
	return {
		bindings: { ...(animations?.bindings ?? {}) },
		channels: { ...(animations?.channels ?? {}) },
	};
}

function getBindingChannelKind({
	kind,
}: {
	kind: AnimationBindingKind;
}): AnimationChannel["kind"] {
	return kind === "discrete" ? "discrete" : "scalar";
}

function getPrimaryComponent({
	binding,
}: {
	binding: AnimationBindingInstance;
}) {
	return binding.components[0] ?? null;
}

function getPrimaryChannelId({
	binding,
}: {
	binding: AnimationBindingInstance;
}) {
	return getPrimaryComponent({ binding })?.channelId ?? null;
}

function getScalarSegmentType({
	interpolation,
}: {
	interpolation: AnimationInterpolation;
}): ScalarSegmentType {
	if (interpolation === "hold") {
		return "step";
	}
	return interpolation === "bezier" ? "bezier" : "linear";
}

function getInterpolationForBinding({
	kind,
	interpolation,
}: {
	kind: AnimationBindingKind;
	interpolation: AnimationInterpolation | undefined;
}): AnimationInterpolation {
	if (kind === "discrete") {
		return "hold";
	}

	if (
		interpolation === "linear" ||
		interpolation === "hold" ||
		interpolation === "bezier"
	) {
		return interpolation;
	}

	return "linear";
}

function createEmptyChannelForBindingKind({
	kind,
}: {
	kind: AnimationBindingKind;
}): AnimationChannel {
	if (kind === "discrete") {
		return {
			kind: "discrete",
			keys: [],
		} satisfies DiscreteAnimationChannel;
	}

	return {
		kind: "scalar",
		keys: [],
	} satisfies ScalarAnimationChannel;
}

function createScalarKey({
	id,
	time,
	value,
	interpolation,
	previousKey,
}: {
	id: string;
	time: MediaTime;
	value: number;
	interpolation?: AnimationInterpolation;
	previousKey?: ScalarAnimationKey;
}): ScalarAnimationKey {
	return {
		id,
		time,
		value,
		leftHandle: previousKey?.leftHandle,
		rightHandle: previousKey?.rightHandle,
		segmentToNext:
			previousKey?.segmentToNext ??
			getScalarSegmentType({ interpolation: interpolation ?? "linear" }),
		tangentMode: previousKey?.tangentMode ?? "flat",
	};
}

function createDiscreteKey({
	id,
	time,
	value,
}: {
	id: string;
	time: MediaTime;
	value: string | boolean;
}): DiscreteAnimationKey {
	return {
		id,
		time,
		value,
	};
}

function getBinding({
	animations,
	propertyPath,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
}): AnimationBindingInstance | undefined {
	return animations?.bindings[propertyPath];
}

function getChannelById({
	animations,
	channelId,
}: {
	animations: ElementAnimations | undefined;
	channelId: string;
}): AnimationChannel | undefined {
	return animations?.channels[channelId];
}

function getBindingComponent({
	binding,
	componentKey,
}: {
	binding: AnimationBindingInstance;
	componentKey: string;
}) {
	return binding.components.find((component) => component.key === componentKey) ?? null;
}

function getTargetKeyMetadata({
	channel,
	time,
	keyframeId,
}: {
	channel: AnimationChannel | undefined;
	time: MediaTime;
	keyframeId?: string;
}) {
	const normalizedChannel =
		channel != null ? normalizeChannel({ channel }) : undefined;
	const keys = normalizedChannel?.keys ?? [];
	if (keyframeId) {
		const keyById = keys.find((key) => key.id === keyframeId);
		if (keyById) {
			return {
				id: keyById.id,
				time,
			};
		}
	}

	const keyAtTime = keys.find((key) =>
		isNearlySameTime({ leftTime: key.time, rightTime: time }),
	);
	if (keyAtTime) {
		return {
			id: keyAtTime.id,
			time: keyAtTime.time,
		};
	}

	return {
		id: keyframeId ?? generateUUID(),
		time,
	};
}

function upsertDiscreteChannelKey({
	channel,
	time,
	value,
	keyframeId,
}: {
	channel: DiscreteAnimationChannel | undefined;
	time: MediaTime;
	value: string | boolean;
	keyframeId?: string;
}): DiscreteAnimationChannel {
	const normalizedChannel = normalizeChannel({
		channel: channel ?? { kind: "discrete", keys: [] },
	});
	const keys = [...normalizedChannel.keys];
	if (keyframeId) {
		const existingIndex = keys.findIndex((key) => key.id === keyframeId);
		if (existingIndex >= 0) {
			keys[existingIndex] = createDiscreteKey({
				id: keys[existingIndex].id,
				time,
				value,
			});
			return normalizeChannel({
				channel: { kind: "discrete", keys },
			});
		}
	}

	const existingAtTimeIndex = keys.findIndex((key) =>
		isNearlySameTime({ leftTime: key.time, rightTime: time }),
	);
	if (existingAtTimeIndex >= 0) {
		keys[existingAtTimeIndex] = createDiscreteKey({
			id: keys[existingAtTimeIndex].id,
			time: keys[existingAtTimeIndex].time,
			value,
		});
		return normalizeChannel({
			channel: { kind: "discrete", keys },
		});
	}

	keys.push(
		createDiscreteKey({
			id: keyframeId ?? generateUUID(),
			time,
			value,
		}),
	);
	return normalizeChannel({
		channel: { kind: "discrete", keys },
	});
}

function upsertScalarChannelKey({
	channel,
	time,
	value,
	interpolation,
	defaultInterpolation,
	keyframeId,
}: {
	channel: ScalarAnimationChannel | undefined;
	time: MediaTime;
	value: number;
	interpolation?: AnimationInterpolation;
	defaultInterpolation?: AnimationInterpolation;
	keyframeId?: string;
}): ScalarAnimationChannel {
	const normalizedChannel = normalizeChannel({
		channel: channel ?? { kind: "scalar", keys: [] },
	});
	const keys = [...normalizedChannel.keys];
	if (keyframeId) {
		const existingIndex = keys.findIndex((key) => key.id === keyframeId);
		if (existingIndex >= 0) {
			keys[existingIndex] = createScalarKey({
				id: keys[existingIndex].id,
				time,
				value,
				interpolation,
				previousKey:
					interpolation != null
						? {
								...keys[existingIndex],
								segmentToNext: getScalarSegmentType({ interpolation }),
							}
						: keys[existingIndex],
			});
			return normalizeChannel({
				channel: {
					kind: "scalar",
					keys,
					extrapolation: normalizedChannel.extrapolation,
				},
			});
		}
	}

	const existingAtTimeIndex = keys.findIndex((key) =>
		isNearlySameTime({ leftTime: key.time, rightTime: time }),
	);
	if (existingAtTimeIndex >= 0) {
		keys[existingAtTimeIndex] = createScalarKey({
			id: keys[existingAtTimeIndex].id,
			time: keys[existingAtTimeIndex].time,
			value,
			interpolation,
			previousKey:
				interpolation != null
					? {
							...keys[existingAtTimeIndex],
							segmentToNext: getScalarSegmentType({ interpolation }),
						}
					: keys[existingAtTimeIndex],
		});
		return normalizeChannel({
			channel: {
				kind: "scalar",
				keys,
				extrapolation: normalizedChannel.extrapolation,
			},
		});
	}

	keys.push(
		createScalarKey({
			id: keyframeId ?? generateUUID(),
			time,
			value,
			interpolation: interpolation ?? defaultInterpolation,
		}),
	);
	return normalizeChannel({
		channel: {
			kind: "scalar",
			keys,
			extrapolation: normalizedChannel.extrapolation,
		},
	});
}

export function getChannel({
	animations,
	propertyPath,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
}): AnimationChannel | undefined {
	const binding = getBinding({ animations, propertyPath });
	const primaryChannelId =
		binding != null ? getPrimaryChannelId({ binding }) : null;
	return primaryChannelId ? animations?.channels[primaryChannelId] : undefined;
}

export function upsertPathKeyframe({
	animations,
	propertyPath,
	time,
	value,
	interpolation,
	keyframeId,
	kind,
	defaultInterpolation,
	coerceValue,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
	time: MediaTime;
	value: AnimationValue;
	interpolation?: AnimationInterpolation;
	keyframeId?: string;
	kind: AnimationBindingKind;
	defaultInterpolation: AnimationInterpolation;
	coerceValue: ({ value }: { value: AnimationValue }) => AnimationValue | null;
}): ElementAnimations | undefined {
	const coercedValue = coerceValue({ value });
	if (coercedValue === null) {
		return animations;
	}

	const nextAnimations = cloneAnimationsState({ animations });
	const existingBinding = getBinding({
		animations,
		propertyPath,
	});
	const binding =
		existingBinding && existingBinding.kind === kind
			? cloneAnimationBinding({ binding: existingBinding })
			: createAnimationBinding({ path: propertyPath, kind });
	const primaryChannel = getChannel({
		animations,
		propertyPath,
	});
	const targetKey = getTargetKeyMetadata({
		channel: primaryChannel,
		time,
		keyframeId,
	});
	const componentValues = decomposeAnimationValue({
		kind,
		value: coercedValue,
	});
	if (!componentValues) {
		return animations;
	}

	const explicitInterpolation =
		interpolation != null
			? getInterpolationForBinding({ kind, interpolation })
			: undefined;
	const validatedDefaultInterpolation = getInterpolationForBinding({
		kind,
		interpolation: defaultInterpolation,
	});
	nextAnimations.bindings[propertyPath] = binding;
	for (const component of binding.components) {
		const nextValue = componentValues[component.key];
		if (nextValue == null) {
			continue;
		}

		const currentChannel = getChannelById({
			animations,
			channelId: component.channelId,
		});
		const targetChannel =
			currentChannel?.kind === getBindingChannelKind({ kind })
				? currentChannel
				: createEmptyChannelForBindingKind({ kind });
		nextAnimations.channels[component.channelId] =
			targetChannel.kind === "discrete"
				? upsertDiscreteChannelKey({
						channel: targetChannel,
						time: targetKey.time,
						value: nextValue as string | boolean,
						keyframeId: targetKey.id,
					})
				: upsertScalarChannelKey({
						channel: targetChannel,
						time: targetKey.time,
						value: nextValue as number,
						interpolation: explicitInterpolation,
						defaultInterpolation: validatedDefaultInterpolation,
						keyframeId: targetKey.id,
					});
	}

	return toAnimation({
		animations: nextAnimations,
	});
}

export function upsertElementKeyframe({
	animations,
	propertyPath,
	time,
	value,
	interpolation,
	keyframeId,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPropertyPath;
	time: MediaTime;
	value: AnimationValue;
	interpolation?: AnimationInterpolation;
	keyframeId?: string;
}): ElementAnimations | undefined {
	const coercedValue = coerceAnimationValueForProperty({
		propertyPath,
		value,
	});
	if (coercedValue === null) {
		return animations;
	}

	const propertyDefinition = getAnimationPropertyDefinition({ propertyPath });
	return upsertPathKeyframe({
		animations,
		propertyPath,
		time,
		value: coercedValue,
		interpolation,
		keyframeId,
		kind: propertyDefinition.kind,
		defaultInterpolation: propertyDefinition.defaultInterpolation,
		coerceValue: ({ value: nextValue }) =>
			coerceAnimationValueForProperty({
				propertyPath,
				value: nextValue,
			}),
	});
}

export function upsertKeyframe({
	channel,
	time,
	value,
	interpolation,
	keyframeId,
}: {
	channel: AnimationChannel | undefined;
	time: MediaTime;
	value: AnimationValue;
	interpolation?: AnimationInterpolation;
	keyframeId?: string;
}): AnimationChannel | undefined {
	if (!channel) {
		return undefined;
	}

	if (channel.kind === "discrete") {
		if (typeof value !== "string" && typeof value !== "boolean") {
			return channel;
		}

		return upsertDiscreteChannelKey({
			channel,
			time,
			value,
			keyframeId,
		});
	}

	if (typeof value !== "number") {
		return channel;
	}

	return upsertScalarChannelKey({
		channel,
		time,
		value,
		interpolation,
		keyframeId,
	});
}

export function removeKeyframe({
	channel,
	keyframeId,
}: {
	channel: AnimationChannel | undefined;
	keyframeId: string;
}): AnimationChannel | undefined {
	if (!channel) {
		return undefined;
	}

	const nextKeys = channel.keys.filter((keyframe) => keyframe.id !== keyframeId);
	if (nextKeys.length === 0) {
		return undefined;
	}

	return normalizeChannel({
		channel: {
			...channel,
			keys: nextKeys,
		} as AnimationChannel,
	});
}

export function retimeKeyframe({
	channel,
	keyframeId,
	time,
}: {
	channel: AnimationChannel | undefined;
	keyframeId: string;
	time: MediaTime;
}): AnimationChannel | undefined {
	if (!channel) {
		return undefined;
	}

	const keyframeByIdIndex = channel.keys.findIndex(
		(keyframe) => keyframe.id === keyframeId,
	);
	if (keyframeByIdIndex < 0) {
		return channel;
	}

	const nextKeys = [...channel.keys];
	nextKeys[keyframeByIdIndex] = {
		...nextKeys[keyframeByIdIndex],
		time,
	};

	return normalizeChannel({
		channel: {
			...channel,
			keys: nextKeys,
		} as AnimationChannel,
	});
}

export function setChannel({
	animations,
	propertyPath,
	channel,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
	channel: AnimationChannel | undefined;
}): ElementAnimations | undefined {
	const binding = getBinding({ animations, propertyPath });
	if (!binding) {
		return animations;
	}

	if (binding.components.length !== 1) {
		throw new Error(
			`setChannel only supports single-component bindings. Received "${propertyPath}" with ${binding.components.length} components.`,
		);
	}

	const primaryComponent = getPrimaryComponent({ binding });
	if (!primaryComponent) {
		return animations;
	}

	return setBindingComponentChannel({
		animations,
		propertyPath,
		componentKey: primaryComponent.key,
		channel,
	});
}

export function setBindingComponentChannel({
	animations,
	propertyPath,
	componentKey,
	channel,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
	componentKey: string;
	channel: AnimationChannel | undefined;
}): ElementAnimations | undefined {
	const binding = getBinding({ animations, propertyPath });
	if (!binding) {
		return animations;
	}

	const component = getBindingComponent({
		binding,
		componentKey,
	});
	if (!component) {
		return animations;
	}

	const nextAnimations = cloneAnimationsState({ animations });
	if (!channel || !hasChannelKeys({ channel })) {
		delete nextAnimations.channels[component.channelId];
		const hasRemainingKeys = binding.components.some((candidate) =>
			hasChannelKeys({
				channel: nextAnimations.channels[candidate.channelId],
			}),
		);
		if (!hasRemainingKeys) {
			delete nextAnimations.bindings[propertyPath];
		}
		return toAnimation({
			animations: nextAnimations,
		});
	}

	nextAnimations.channels[component.channelId] = normalizeChannel({
		channel,
	});
	return toAnimation({
		animations: nextAnimations,
	});
}

export function updateScalarKeyframeCurve({
	animations,
	propertyPath,
	componentKey,
	keyframeId,
	patch,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
	componentKey: string;
	keyframeId: string;
	patch: ScalarCurveKeyframePatch;
}): ElementAnimations | undefined {
	const binding = getBinding({ animations, propertyPath });
	if (!binding) {
		return animations;
	}

	const component = getBindingComponent({
		binding,
		componentKey,
	});
	if (!component) {
		return animations;
	}

	const channel = getChannelById({
		animations,
		channelId: component.channelId,
	});
	if (channel?.kind !== "scalar") {
		return animations;
	}

	const keyframeIndex = channel.keys.findIndex((keyframe) => keyframe.id === keyframeId);
	if (keyframeIndex < 0) {
		return animations;
	}

	const nextKeys = [...channel.keys];
	const currentKey = nextKeys[keyframeIndex];
	nextKeys[keyframeIndex] = {
		...currentKey,
		leftHandle:
			patch.leftHandle === undefined
				? currentKey.leftHandle
				: patch.leftHandle ?? undefined,
		rightHandle:
			patch.rightHandle === undefined
				? currentKey.rightHandle
				: patch.rightHandle ?? undefined,
		segmentToNext: patch.segmentToNext ?? currentKey.segmentToNext,
		tangentMode: patch.tangentMode ?? currentKey.tangentMode,
	};

	return setBindingComponentChannel({
		animations,
		propertyPath,
		componentKey,
		channel: {
			kind: "scalar",
			keys: nextKeys,
			extrapolation: channel.extrapolation,
		},
	});
}

export function cloneAnimations({
	animations,
	shouldRegenerateKeyframeIds = false,
}: {
	animations: ElementAnimations | undefined;
	shouldRegenerateKeyframeIds?: boolean;
}): ElementAnimations | undefined {
	if (!animations) {
		return undefined;
	}

	const nextAnimations = cloneAnimationsState({ animations });
	nextAnimations.bindings = Object.fromEntries(
		Object.entries(animations.bindings).map(([path, binding]) => [
			path,
			binding ? cloneAnimationBinding({ binding }) : binding,
		]),
	);
	nextAnimations.channels = {};

	for (const binding of Object.values(nextAnimations.bindings)) {
		if (!binding) {
			continue;
		}

		const primaryChannel = getChannelById({
			animations,
			channelId: getPrimaryChannelId({ binding }) ?? "",
		});
		const keyIdMap = new Map<string, string>();
		if (primaryChannel) {
			for (const key of primaryChannel.keys) {
				keyIdMap.set(
					key.id,
					shouldRegenerateKeyframeIds ? generateUUID() : key.id,
				);
			}
		}

		for (const component of binding.components) {
			const currentChannel = getChannelById({
				animations,
				channelId: component.channelId,
			});
			if (!currentChannel) {
				continue;
			}

			nextAnimations.channels[component.channelId] = normalizeChannel({
				channel: {
					...currentChannel,
					keys: currentChannel.keys.map((key) => ({
						...key,
						id: keyIdMap.get(key.id) ?? key.id,
					})),
				} as AnimationChannel,
			});
		}
	}

	return toAnimation({
		animations: nextAnimations,
	});
}

export function clampAnimationsToDuration({
	animations,
	duration,
}: {
	animations: ElementAnimations | undefined;
	duration: MediaTime;
}): ElementAnimations | undefined {
	if (!animations || duration <= 0) {
		return undefined;
	}

	return splitAnimationsAtTime({
		animations,
		splitTime: duration,
		shouldIncludeSplitBoundary: true,
	}).leftAnimations;
}

function lerpPoint({
	left,
	right,
	progress,
}: {
	left: { x: number; y: number };
	right: { x: number; y: number };
	progress: number;
}) {
	return {
		x: left.x + (right.x - left.x) * progress,
		y: left.y + (right.y - left.y) * progress,
	};
}

function splitDiscreteChannelAtTime({
	channel,
	splitTime,
	leftBoundaryId,
	rightBoundaryId,
	shouldIncludeSplitBoundary,
}: {
	channel: DiscreteAnimationChannel | undefined;
	splitTime: MediaTime;
	leftBoundaryId: string;
	rightBoundaryId: string;
	shouldIncludeSplitBoundary: boolean;
}) {
	if (!channel || channel.keys.length === 0) {
		return {
			leftChannel: undefined,
			rightChannel: undefined,
		};
	}

	const normalizedChannel = normalizeChannel({ channel });
	let leftKeys = normalizedChannel.keys.filter((key) => key.time <= splitTime);
	let rightKeys = normalizedChannel.keys
		.filter((key) => key.time >= splitTime)
		.map((key) => ({
			...key,
			time: subMediaTime({ a: key.time, b: splitTime }),
		}));

	if (shouldIncludeSplitBoundary) {
		const hasBoundaryOnLeft = leftKeys.some((key) =>
			isNearlySameTime({ leftTime: key.time, rightTime: splitTime }),
		);
		const hasBoundaryOnRight = rightKeys.some((key) =>
			isNearlySameTime({ leftTime: key.time, rightTime: 0 }),
		);
		const boundaryValue = getChannelValueAtTime({
			channel: normalizedChannel,
			time: splitTime,
			fallbackValue: normalizedChannel.keys[0].value,
		});
		if (!hasBoundaryOnLeft) {
			leftKeys = [
				...leftKeys,
				createDiscreteKey({
					id: leftBoundaryId,
					time: splitTime,
					value: boundaryValue as string | boolean,
				}),
			];
		}
		if (!hasBoundaryOnRight) {
			rightKeys = [
				createDiscreteKey({
					id: rightBoundaryId,
					time: ZERO_MEDIA_TIME,
					value: boundaryValue as string | boolean,
				}),
				...rightKeys,
			];
		}
	}

	return {
		leftChannel: leftKeys.length
			? normalizeChannel({ channel: { kind: "discrete", keys: leftKeys } })
			: undefined,
		rightChannel: rightKeys.length
			? normalizeChannel({ channel: { kind: "discrete", keys: rightKeys } })
			: undefined,
	};
}

function splitScalarChannelAtTime({
	channel,
	splitTime,
	leftBoundaryId,
	rightBoundaryId,
	shouldIncludeSplitBoundary,
}: {
	channel: ScalarAnimationChannel | undefined;
	splitTime: MediaTime;
	leftBoundaryId: string;
	rightBoundaryId: string;
	shouldIncludeSplitBoundary: boolean;
}) {
	if (!channel || channel.keys.length === 0) {
		return {
			leftChannel: undefined,
			rightChannel: undefined,
		};
	}

	const normalizedChannel = normalizeChannel({ channel });
	let leftKeys = normalizedChannel.keys.filter((key) => key.time <= splitTime);
	let rightKeys = normalizedChannel.keys
		.filter((key) => key.time >= splitTime)
		.map((key) => ({
			...key,
			time: subMediaTime({ a: key.time, b: splitTime }),
		}));

	const hasBoundaryOnLeft = leftKeys.some((key) =>
		isNearlySameTime({ leftTime: key.time, rightTime: splitTime }),
	);
	const hasBoundaryOnRight = rightKeys.some((key) =>
		isNearlySameTime({ leftTime: key.time, rightTime: 0 }),
	);
	if (!shouldIncludeSplitBoundary || (hasBoundaryOnLeft && hasBoundaryOnRight)) {
		return {
			leftChannel: leftKeys.length
				? normalizeChannel({
						channel: {
							kind: "scalar",
							keys: leftKeys,
							extrapolation: normalizedChannel.extrapolation,
						},
					})
				: undefined,
			rightChannel: rightKeys.length
				? normalizeChannel({
						channel: {
							kind: "scalar",
							keys: rightKeys,
							extrapolation: normalizedChannel.extrapolation,
						},
					})
				: undefined,
		};
	}

	for (let keyIndex = 0; keyIndex < normalizedChannel.keys.length - 1; keyIndex++) {
		const leftKey = normalizedChannel.keys[keyIndex];
		const rightKey = normalizedChannel.keys[keyIndex + 1];
		if (
			!(
				splitTime > leftKey.time &&
				splitTime < rightKey.time
			)
		) {
			continue;
		}

		const boundaryValue = getChannelValueAtTime({
			channel: normalizedChannel,
			time: splitTime,
			fallbackValue: leftKey.value,
		}) as number;

		if (leftKey.segmentToNext === "bezier") {
			const rightHandle =
				leftKey.rightHandle ?? getDefaultRightHandle({ leftKey, rightKey });
			const leftHandle =
				rightKey.leftHandle ?? getDefaultLeftHandle({ leftKey, rightKey });
			const progress = solveBezierProgressForTime({
				time: splitTime,
				leftKey,
				rightKey,
			});
			const p0 = { x: leftKey.time, y: leftKey.value };
			const p1 = {
				x: leftKey.time + rightHandle.dt,
				y: leftKey.value + rightHandle.dv,
			};
			const p2 = {
				x: rightKey.time + leftHandle.dt,
				y: rightKey.value + leftHandle.dv,
			};
			const p3 = { x: rightKey.time, y: rightKey.value };
			const q0 = lerpPoint({ left: p0, right: p1, progress });
			const q1 = lerpPoint({ left: p1, right: p2, progress });
			const q2 = lerpPoint({ left: p2, right: p3, progress });
			const r0 = lerpPoint({ left: q0, right: q1, progress });
			const r1 = lerpPoint({ left: q1, right: q2, progress });
			const splitPoint = lerpPoint({ left: r0, right: r1, progress });
			leftKeys = [
				...normalizedChannel.keys.filter((key) => key.time < splitTime),
				{
					...leftKey,
					rightHandle: {
						dt: roundMediaTime({ time: q0.x - p0.x }),
						dv: q0.y - p0.y,
					},
				},
				{
					id: leftBoundaryId,
					time: splitTime,
					value: boundaryValue,
					leftHandle: {
						dt: roundMediaTime({ time: r0.x - splitPoint.x }),
						dv: r0.y - splitPoint.y,
					},
					segmentToNext: leftKey.segmentToNext,
					tangentMode: leftKey.tangentMode,
				},
			];
			rightKeys = [
				{
					id: rightBoundaryId,
					time: ZERO_MEDIA_TIME,
					value: boundaryValue,
					rightHandle: {
						dt: roundMediaTime({ time: r1.x - splitPoint.x }),
						dv: r1.y - splitPoint.y,
					},
					segmentToNext: "bezier",
					tangentMode: leftKey.tangentMode,
				},
				{
					...rightKey,
					time: subMediaTime({ a: rightKey.time, b: splitTime }),
					leftHandle: {
						dt: roundMediaTime({ time: q2.x - p3.x }),
						dv: q2.y - p3.y,
					},
				},
				...normalizedChannel.keys
					.filter((key) => key.time > rightKey.time)
					.map((key) => ({
						...key,
						time: subMediaTime({ a: key.time, b: splitTime }),
					})),
			];
		} else {
			leftKeys = [
				...leftKeys,
				createScalarKey({
					id: leftBoundaryId,
					time: splitTime,
					value: boundaryValue,
					interpolation: "linear",
				}),
			];
			rightKeys = [
				createScalarKey({
					id: rightBoundaryId,
					time: ZERO_MEDIA_TIME,
					value: boundaryValue,
					interpolation: getScalarSegmentInterpolation({
						segment: leftKey.segmentToNext,
					}),
				}),
				...rightKeys,
			];
		}

		return {
			leftChannel: normalizeChannel({
				channel: {
					kind: "scalar",
					keys: leftKeys,
					extrapolation: normalizedChannel.extrapolation,
				},
			}),
			rightChannel: normalizeChannel({
				channel: {
					kind: "scalar",
					keys: rightKeys,
					extrapolation: normalizedChannel.extrapolation,
				},
			}),
		};
	}

	return {
		leftChannel: leftKeys.length
			? normalizeChannel({
					channel: {
						kind: "scalar",
						keys: leftKeys,
						extrapolation: normalizedChannel.extrapolation,
					},
				})
			: undefined,
		rightChannel: rightKeys.length
			? normalizeChannel({
					channel: {
						kind: "scalar",
						keys: rightKeys,
						extrapolation: normalizedChannel.extrapolation,
					},
				})
			: undefined,
	};
}

export function splitAnimationsAtTime({
	animations,
	splitTime,
	shouldIncludeSplitBoundary = true,
}: {
	animations: ElementAnimations | undefined;
	splitTime: MediaTime;
	shouldIncludeSplitBoundary?: boolean;
}): {
	leftAnimations: ElementAnimations | undefined;
	rightAnimations: ElementAnimations | undefined;
} {
	if (!animations) {
		return { leftAnimations: undefined, rightAnimations: undefined };
	}

	const leftAnimations = cloneAnimationsState({ animations: undefined });
	const rightAnimations = cloneAnimationsState({ animations: undefined });

	for (const [propertyPath, binding] of Object.entries(animations.bindings)) {
		if (!binding) {
			continue;
		}

		const leftBinding = cloneAnimationBinding({ binding });
		const rightBinding = cloneAnimationBinding({ binding });
		const leftBoundaryId = generateUUID();
		const rightBoundaryId = generateUUID();
		let hasLeftKeys = false;
		let hasRightKeys = false;

		for (const component of binding.components) {
			const channel = getChannelById({
				animations,
				channelId: component.channelId,
			});
			const splitResult =
				channel?.kind === "discrete"
					? splitDiscreteChannelAtTime({
							channel,
							splitTime,
							leftBoundaryId,
							rightBoundaryId,
							shouldIncludeSplitBoundary,
						})
					: splitScalarChannelAtTime({
							channel: channel as ScalarAnimationChannel | undefined,
							splitTime,
							leftBoundaryId,
							rightBoundaryId,
							shouldIncludeSplitBoundary,
						});
			if (splitResult.leftChannel) {
				leftAnimations.channels[component.channelId] = splitResult.leftChannel;
				hasLeftKeys = true;
			}
			if (splitResult.rightChannel) {
				rightAnimations.channels[component.channelId] = splitResult.rightChannel;
				hasRightKeys = true;
			}
		}

		if (hasLeftKeys) {
			leftAnimations.bindings[propertyPath] = leftBinding;
		}
		if (hasRightKeys) {
			rightAnimations.bindings[propertyPath] = rightBinding;
		}
	}

	return {
		leftAnimations: toAnimation({ animations: leftAnimations }),
		rightAnimations: toAnimation({ animations: rightAnimations }),
	};
}

export function removeElementKeyframe({
	animations,
	propertyPath,
	keyframeId,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
	keyframeId: string;
}): ElementAnimations | undefined {
	const binding = getBinding({ animations, propertyPath });
	if (!binding) {
		return animations;
	}

	const nextAnimations = cloneAnimationsState({ animations });
	for (const component of binding.components) {
		nextAnimations.channels[component.channelId] = removeKeyframe({
			channel: nextAnimations.channels[component.channelId],
			keyframeId,
		});
	}
	const hasRemainingKeys = binding.components.some((component) =>
		hasChannelKeys({
			channel: nextAnimations.channels[component.channelId],
		}),
	);
	if (!hasRemainingKeys) {
		delete nextAnimations.bindings[propertyPath];
		for (const component of binding.components) {
			delete nextAnimations.channels[component.channelId];
		}
	}
	return toAnimation({
		animations: nextAnimations,
	});
}

export function retimeElementKeyframe({
	animations,
	propertyPath,
	keyframeId,
	time,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
	keyframeId: string;
	time: MediaTime;
}): ElementAnimations | undefined {
	const binding = getBinding({ animations, propertyPath });
	if (!binding) {
		return animations;
	}

	const nextAnimations = cloneAnimationsState({ animations });
	for (const component of binding.components) {
		nextAnimations.channels[component.channelId] = retimeKeyframe({
			channel: nextAnimations.channels[component.channelId],
			keyframeId,
			time,
		});
	}
	return toAnimation({
		animations: nextAnimations,
	});
}

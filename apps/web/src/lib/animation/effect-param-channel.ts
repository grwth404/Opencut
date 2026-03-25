import type { ParamValues } from "@/lib/params";
import type { Effect } from "@/lib/effects/types";
import type {
	ElementAnimations,
	EffectParamPath,
	NumberAnimationChannel,
} from "@/lib/animation/types";
import {
	getChannel,
	removeKeyframe,
	setChannel,
	upsertKeyframe,
} from "./keyframes";
import { getChannelValueAtTime } from "./interpolation";

export const EFFECT_PARAM_PATH_PREFIX = "effects.";
export const EFFECT_PARAM_PATH_SUFFIX = ".params.";

export function buildEffectParamPath({
	effectId,
	paramKey,
}: {
	effectId: string;
	paramKey: string;
}): EffectParamPath {
	return `${EFFECT_PARAM_PATH_PREFIX}${effectId}${EFFECT_PARAM_PATH_SUFFIX}${paramKey}`;
}

export function isEffectParamPath({
	propertyPath,
}: {
	propertyPath: string;
}): propertyPath is EffectParamPath {
	return (
		propertyPath.startsWith(EFFECT_PARAM_PATH_PREFIX) &&
		propertyPath.includes(EFFECT_PARAM_PATH_SUFFIX)
	);
}

export function parseEffectParamPath({
	propertyPath,
}: {
	propertyPath: string;
}): { effectId: string; paramKey: string } | null {
	if (!isEffectParamPath({ propertyPath })) {
		return null;
	}

	const withoutPrefix = propertyPath.slice(EFFECT_PARAM_PATH_PREFIX.length);
	const separatorIndex = withoutPrefix.indexOf(EFFECT_PARAM_PATH_SUFFIX);
	if (separatorIndex <= 0) {
		return null;
	}

	const effectId = withoutPrefix.slice(0, separatorIndex);
	const paramKey = withoutPrefix.slice(
		separatorIndex + EFFECT_PARAM_PATH_SUFFIX.length,
	);
	if (!effectId || !paramKey) {
		return null;
	}

	return { effectId, paramKey };
}

export function resolveEffectParamsAtTime({
	effect,
	animations,
	localTime,
}: {
	effect: Effect;
	animations: ElementAnimations | undefined;
	localTime: number;
}): ParamValues {
	const resolved: ParamValues = {};

	for (const [paramKey, staticValue] of Object.entries(effect.params)) {
		const path = buildEffectParamPath({ effectId: effect.id, paramKey });
		const channel = getChannel({ animations, propertyPath: path });
		if (channel && channel.keyframes.length > 0) {
			resolved[paramKey] = getChannelValueAtTime({
				channel,
				time: localTime,
				fallbackValue: staticValue,
			}) as number | string | boolean;
		} else {
			resolved[paramKey] = staticValue;
		}
	}

	return resolved;
}

const EMPTY_NUMBER_CHANNEL: NumberAnimationChannel = {
	valueKind: "number",
	keyframes: [],
};

export function upsertEffectParamKeyframe({
	animations,
	effectId,
	paramKey,
	time,
	value,
	interpolation,
	keyframeId,
}: {
	animations: ElementAnimations | undefined;
	effectId: string;
	paramKey: string;
	time: number;
	value: number;
	interpolation?: "linear" | "hold";
	keyframeId?: string;
}): ElementAnimations | undefined {
	const path = buildEffectParamPath({ effectId, paramKey });
	const channel = getChannel({ animations, propertyPath: path });
	const targetChannel =
		channel && channel.valueKind === "number" ? channel : EMPTY_NUMBER_CHANNEL;
	const updatedChannel = upsertKeyframe({
		channel: targetChannel,
		time,
		value,
		interpolation: interpolation ?? "linear",
		keyframeId,
	});

	return (
		setChannel({
			animations,
			propertyPath: path,
			channel: updatedChannel,
		}) ?? { channels: {} }
	);
}

export function removeEffectParamKeyframe({
	animations,
	effectId,
	paramKey,
	keyframeId,
}: {
	animations: ElementAnimations | undefined;
	effectId: string;
	paramKey: string;
	keyframeId: string;
}): ElementAnimations | undefined {
	const path = buildEffectParamPath({ effectId, paramKey });
	const channel = getChannel({ animations, propertyPath: path });
	const updatedChannel = removeKeyframe({ channel, keyframeId });
	return setChannel({
		animations,
		propertyPath: path,
		channel: updatedChannel,
	});
}

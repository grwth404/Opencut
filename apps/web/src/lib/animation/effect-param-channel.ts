import type { ParamValues } from "@/lib/params";
import type { Effect } from "@/lib/effects/types";
import type {
	ElementAnimations,
	EffectParamPath,
} from "@/lib/animation/types";
import { removeElementKeyframe } from "./keyframes";
import { resolveAnimationPathValueAtTime } from "./resolve";

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

export function isEffectParamPath(
	propertyPath: string,
): propertyPath is EffectParamPath {
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
	if (!isEffectParamPath(propertyPath)) {
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
		resolved[paramKey] = animations?.bindings[path]
			? resolveAnimationPathValueAtTime({
					animations,
					propertyPath: path,
					localTime,
					fallbackValue: staticValue,
				})
			: staticValue;
	}

	return resolved;
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
	return removeElementKeyframe({
		animations,
		propertyPath: buildEffectParamPath({ effectId, paramKey }),
		keyframeId,
	});
}

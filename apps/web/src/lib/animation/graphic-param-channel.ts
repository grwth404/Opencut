import type {
	ElementAnimations,
	GraphicParamPath,
} from "@/lib/animation/types";
import type { ParamValues } from "@/lib/params";
import {
	getGraphicDefinition,
	resolveGraphicParams,
} from "@/lib/graphics";
import { resolveAnimationPathValueAtTime } from "./resolve";

export const GRAPHIC_PARAM_PATH_PREFIX = "params.";

export function buildGraphicParamPath({
	paramKey,
}: {
	paramKey: string;
}): GraphicParamPath {
	return `${GRAPHIC_PARAM_PATH_PREFIX}${paramKey}`;
}

export function isGraphicParamPath(
	propertyPath: string,
): propertyPath is GraphicParamPath {
	return propertyPath.startsWith(GRAPHIC_PARAM_PATH_PREFIX);
}

export function parseGraphicParamPath({
	propertyPath,
}: {
	propertyPath: string;
}): { paramKey: string } | null {
	if (!isGraphicParamPath(propertyPath)) {
		return null;
	}

	const paramKey = propertyPath.slice(GRAPHIC_PARAM_PATH_PREFIX.length);
	return paramKey.length > 0 ? { paramKey } : null;
}

export function resolveGraphicParamsAtTime({
	element,
	localTime,
}: {
	element: {
		definitionId: string;
		params: ParamValues;
		animations?: ElementAnimations;
	};
	localTime: number;
}): ParamValues {
	const definition = getGraphicDefinition({
		definitionId: element.definitionId,
	});
	const baseParams = resolveGraphicParams(definition, element.params);
	const resolved: ParamValues = { ...baseParams };

	for (const param of definition.params) {
		const path = buildGraphicParamPath({ paramKey: param.key });
		if (!element.animations?.bindings[path]) {
			continue;
		}

		resolved[param.key] = resolveAnimationPathValueAtTime({
			animations: element.animations,
			propertyPath: path,
			localTime: Math.max(0, localTime),
			fallbackValue: baseParams[param.key] ?? param.default,
		});
	}

	return resolved;
}

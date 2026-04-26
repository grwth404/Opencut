import type {
	AnimationBindingKind,
	AnimationInterpolation,
	AnimationPath,
	AnimationValue,
	NumericSpec,
} from "@/animation/types";
import {
	coerceAnimationParamValue,
	getAnimationParamDefaultInterpolation,
	getAnimationParamNumericRange,
	getAnimationParamValueKind,
} from "@/animation/animated-params";
import {
	parseEffectParamPath,
} from "@/animation/effect-param-channel";
import {
	parseGraphicParamPath,
} from "@/animation/graphic-param-channel";
import { effectsRegistry, registerDefaultEffects } from "@/effects";
import { getGraphicDefinition } from "@/graphics";
import type { ParamDefinition } from "@/params";
import type { TimelineElement } from "@/timeline";
import { isVisualElement } from "@/timeline/element-utils";
import { isAnimationPropertyPath } from "@/animation/path";
import {
	coerceAnimationValueForProperty,
	getAnimationPropertyDefinition,
	getElementBaseValueForProperty,
	withElementBaseValueForProperty,
} from "./animation-properties";

export interface AnimationPathDescriptor {
	kind: AnimationBindingKind;
	defaultInterpolation: AnimationInterpolation;
	numericRanges?: Partial<Record<string, NumericSpec>>;
	coerceValue: ({ value }: { value: AnimationValue }) => AnimationValue | null;
	getBaseValue: () => AnimationValue | null;
	setBaseValue: ({ value }: { value: AnimationValue }) => TimelineElement;
}

// Number/discrete bindings expose a single component named "value"
// (see binding-values.ts). Multi-component kinds (vector2, color) don't carry
// numeric ranges yet — revisit when one does.
function paramNumericRanges({
	param,
}: {
	param: ParamDefinition;
}): Partial<Record<string, NumericSpec>> | undefined {
	const range = getAnimationParamNumericRange({ param });
	return range ? { value: range } : undefined;
}

function buildGraphicParamDescriptor({
	element,
	paramKey,
}: {
	element: TimelineElement;
	paramKey: string;
}): AnimationPathDescriptor | null {
	if (element.type !== "graphic") {
		return null;
	}

	const definition = getGraphicDefinition({
		definitionId: element.definitionId,
	});
	const param = definition.params.find((candidate) => candidate.key === paramKey);
	if (!param) {
		return null;
	}

	return {
		kind: getAnimationParamValueKind({ param }),
		defaultInterpolation: getAnimationParamDefaultInterpolation({ param }),
		numericRanges: paramNumericRanges({ param }),
		coerceValue: ({ value }) => coerceAnimationParamValue({ param, value }),
		getBaseValue: () => element.params[param.key] ?? param.default,
		setBaseValue: ({ value }) => {
			const coercedValue = coerceAnimationParamValue({ param, value });
			if (coercedValue === null) {
				return element;
			}

			return {
				...element,
				params: {
					...element.params,
					[param.key]: coercedValue,
				},
			};
		},
	};
}

function buildEffectParamDescriptor({
	element,
	effectId,
	paramKey,
}: {
	element: TimelineElement;
	effectId: string;
	paramKey: string;
}): AnimationPathDescriptor | null {
	if (!isVisualElement(element)) {
		return null;
	}

	const effect = element.effects?.find((candidate) => candidate.id === effectId);
	if (!effect) {
		return null;
	}

	registerDefaultEffects();
	const definition = effectsRegistry.get(effect.type);
	const param = definition.params.find((candidate) => candidate.key === paramKey);
	if (!param) {
		return null;
	}

	return {
		kind: getAnimationParamValueKind({ param }),
		defaultInterpolation: getAnimationParamDefaultInterpolation({ param }),
		numericRanges: paramNumericRanges({ param }),
		coerceValue: ({ value }) => coerceAnimationParamValue({ param, value }),
		getBaseValue: () => effect.params[param.key] ?? param.default,
		setBaseValue: ({ value }) => {
			const coercedValue = coerceAnimationParamValue({ param, value });
			if (coercedValue === null) {
				return element;
			}

			return {
				...element,
				effects:
					element.effects?.map((candidate) =>
						candidate.id !== effectId
							? candidate
							: {
									...candidate,
									params: {
										...candidate.params,
										[param.key]: coercedValue,
									},
								},
					) ?? element.effects,
			};
		},
	};
}

export function resolveAnimationTarget({
	element,
	path,
}: {
	element: TimelineElement;
	path: AnimationPath;
}): AnimationPathDescriptor | null {
	if (isAnimationPropertyPath(path)) {
		const propertyDefinition = getAnimationPropertyDefinition({
			propertyPath: path,
		});
		if (!propertyDefinition.supportsElement({ element })) {
			return null;
		}

		return {
			kind: propertyDefinition.kind,
			defaultInterpolation: propertyDefinition.defaultInterpolation,
			numericRanges: propertyDefinition.numericRanges,
			coerceValue: ({ value }) =>
				coerceAnimationValueForProperty({
					propertyPath: path,
					value,
				}),
			getBaseValue: () =>
				getElementBaseValueForProperty({
					element,
					propertyPath: path,
				}),
			setBaseValue: ({ value }) => {
				const coercedValue = propertyDefinition.coerceValue({ value });
				if (coercedValue === null) {
					return element;
				}

				return withElementBaseValueForProperty({
					element,
					propertyPath: path,
					value: coercedValue,
				});
			},
		};
	}

	const graphicParamTarget = parseGraphicParamPath({ propertyPath: path });
	if (graphicParamTarget) {
		return buildGraphicParamDescriptor({
			element,
			paramKey: graphicParamTarget.paramKey,
		});
	}

	const effectParamTarget = parseEffectParamPath({ propertyPath: path });
	if (effectParamTarget) {
		return buildEffectParamDescriptor({
			element,
			effectId: effectParamTarget.effectId,
			paramKey: effectParamTarget.paramKey,
		});
	}

	return null;
}

import type {
	AnimationInterpolation,
	AnimationPropertyPath,
	AnimationValue,
	AnimationValueKind,
	DiscreteValue,
	VectorValue,
} from "@/lib/animation/types";
import { isVectorValue } from "./vector-channel";
import type { TimelineElement } from "@/lib/timeline";
import { MIN_TRANSFORM_SCALE } from "@/constants/animation-constants";
import {
	CORNER_RADIUS_MAX,
	CORNER_RADIUS_MIN,
} from "@/constants/text-constants";
import {
	canElementHaveAudio,
	isVisualElement,
} from "@/lib/timeline/element-utils";
import { VOLUME_DB_MAX, VOLUME_DB_MIN } from "@/lib/timeline/audio-constants";
import { DEFAULTS } from "@/lib/timeline/defaults";
import { snapToStep } from "@/utils/math";

export interface NumericSpec {
	min?: number;
	max?: number;
	step?: number;
}

export type NumericRange = NumericSpec;

export interface AnimationPropertyDefinition {
	valueKind: AnimationValueKind;
	defaultInterpolation: AnimationInterpolation;
	numericRange?: NumericSpec;
	supportsElement: ({ element }: { element: TimelineElement }) => boolean;
	getValue: ({ element }: { element: TimelineElement }) => AnimationValue | null;
	setValue: ({
		element,
		value,
	}: {
		element: TimelineElement;
		value: AnimationValue;
	}) => TimelineElement;
}

const ANIMATION_PROPERTY_REGISTRY: Record<
	AnimationPropertyPath,
	AnimationPropertyDefinition
> = {
	"transform.position": {
		valueKind: "vector",
		defaultInterpolation: "linear",
		supportsElement: ({ element }) => isVisualElement(element),
		getValue: ({ element }) =>
			isVisualElement(element) ? element.transform.position : null,
		setValue: ({ element, value }) =>
			isVisualElement(element)
				? {
						...element,
						transform: {
							...element.transform,
							position: value as VectorValue,
						},
					}
				: element,
	},
	"transform.scaleX": {
		valueKind: "number",
		defaultInterpolation: "linear",
		numericRange: { min: MIN_TRANSFORM_SCALE, step: 0.01 },
		supportsElement: ({ element }) => isVisualElement(element),
		getValue: ({ element }) =>
			isVisualElement(element) ? element.transform.scaleX : null,
		setValue: ({ element, value }) =>
			isVisualElement(element)
				? {
						...element,
						transform: { ...element.transform, scaleX: value as number },
					}
				: element,
	},
	"transform.scaleY": {
		valueKind: "number",
		defaultInterpolation: "linear",
		numericRange: { min: MIN_TRANSFORM_SCALE, step: 0.01 },
		supportsElement: ({ element }) => isVisualElement(element),
		getValue: ({ element }) =>
			isVisualElement(element) ? element.transform.scaleY : null,
		setValue: ({ element, value }) =>
			isVisualElement(element)
				? {
						...element,
						transform: { ...element.transform, scaleY: value as number },
					}
				: element,
	},
	"transform.rotate": {
		valueKind: "number",
		defaultInterpolation: "linear",
		numericRange: { min: -360, max: 360, step: 1 },
		supportsElement: ({ element }) => isVisualElement(element),
		getValue: ({ element }) =>
			isVisualElement(element) ? element.transform.rotate : null,
		setValue: ({ element, value }) =>
			isVisualElement(element)
				? {
						...element,
						transform: { ...element.transform, rotate: value as number },
					}
				: element,
	},
	opacity: {
		valueKind: "number",
		defaultInterpolation: "linear",
		numericRange: { min: 0, max: 1, step: 0.01 },
		supportsElement: ({ element }) => isVisualElement(element),
		getValue: ({ element }) =>
			isVisualElement(element) ? element.opacity : null,
		setValue: ({ element, value }) =>
			isVisualElement(element)
				? { ...element, opacity: value as number }
				: element,
	},
	volume: {
		valueKind: "number",
		defaultInterpolation: "linear",
		numericRange: { min: VOLUME_DB_MIN, max: VOLUME_DB_MAX, step: 0.01 },
		supportsElement: ({ element }) => canElementHaveAudio(element),
		getValue: ({ element }) =>
			canElementHaveAudio(element) ? element.volume ?? 0 : null,
		setValue: ({ element, value }) =>
			canElementHaveAudio(element)
				? { ...element, volume: value as number }
				: element,
	},
	color: {
		valueKind: "color",
		defaultInterpolation: "linear",
		supportsElement: ({ element }) => element.type === "text",
		getValue: ({ element }) => (element.type === "text" ? element.color : null),
		setValue: ({ element, value }) =>
			element.type === "text"
				? { ...element, color: value as string }
				: element,
	},
	"background.color": {
		valueKind: "color",
		defaultInterpolation: "linear",
		supportsElement: ({ element }) => element.type === "text",
		getValue: ({ element }) =>
			element.type === "text" ? element.background.color : null,
		setValue: ({ element, value }) =>
			element.type === "text"
				? {
						...element,
						background: { ...element.background, color: value as string },
					}
				: element,
	},
	"background.paddingX": {
		valueKind: "number",
		defaultInterpolation: "linear",
		numericRange: { min: 0, step: 1 },
		supportsElement: ({ element }) => element.type === "text",
		getValue: ({ element }) =>
			element.type === "text"
				? (element.background.paddingX ?? DEFAULTS.text.background.paddingX)
				: null,
		setValue: ({ element, value }) =>
			element.type === "text"
				? {
						...element,
						background: { ...element.background, paddingX: value as number },
					}
				: element,
	},
	"background.paddingY": {
		valueKind: "number",
		defaultInterpolation: "linear",
		numericRange: { min: 0, step: 1 },
		supportsElement: ({ element }) => element.type === "text",
		getValue: ({ element }) =>
			element.type === "text"
				? (element.background.paddingY ?? DEFAULTS.text.background.paddingY)
				: null,
		setValue: ({ element, value }) =>
			element.type === "text"
				? {
						...element,
						background: { ...element.background, paddingY: value as number },
					}
				: element,
	},
	"background.offsetX": {
		valueKind: "number",
		defaultInterpolation: "linear",
		numericRange: { step: 1 },
		supportsElement: ({ element }) => element.type === "text",
		getValue: ({ element }) =>
			element.type === "text"
				? (element.background.offsetX ?? DEFAULTS.text.background.offsetX)
				: null,
		setValue: ({ element, value }) =>
			element.type === "text"
				? {
						...element,
						background: { ...element.background, offsetX: value as number },
					}
				: element,
	},
	"background.offsetY": {
		valueKind: "number",
		defaultInterpolation: "linear",
		numericRange: { step: 1 },
		supportsElement: ({ element }) => element.type === "text",
		getValue: ({ element }) =>
			element.type === "text"
				? (element.background.offsetY ?? DEFAULTS.text.background.offsetY)
				: null,
		setValue: ({ element, value }) =>
			element.type === "text"
				? {
						...element,
						background: { ...element.background, offsetY: value as number },
					}
				: element,
	},
	"background.cornerRadius": {
		valueKind: "number",
		defaultInterpolation: "linear",
		numericRange: { min: CORNER_RADIUS_MIN, max: CORNER_RADIUS_MAX, step: 1 },
		supportsElement: ({ element }) => element.type === "text",
		getValue: ({ element }) =>
			element.type === "text"
				? (element.background.cornerRadius ?? CORNER_RADIUS_MIN)
				: null,
		setValue: ({ element, value }) =>
			element.type === "text"
				? {
						...element,
						background: { ...element.background, cornerRadius: value as number },
					}
				: element,
	},
};

export function isAnimationPropertyPath(
	propertyPath: string,
): propertyPath is AnimationPropertyPath {
	return Object.hasOwn(ANIMATION_PROPERTY_REGISTRY, propertyPath);
}

export function getAnimationPropertyDefinition({
	propertyPath,
}: {
	propertyPath: AnimationPropertyPath;
}): AnimationPropertyDefinition {
	return ANIMATION_PROPERTY_REGISTRY[propertyPath];
}

export function supportsAnimationProperty({
	element,
	propertyPath,
}: {
	element: TimelineElement;
	propertyPath: AnimationPropertyPath;
}): boolean {
	const propertyDefinition = getAnimationPropertyDefinition({ propertyPath });
	return propertyDefinition.supportsElement({ element });
}

export function getElementBaseValueForProperty({
	element,
	propertyPath,
}: {
	element: TimelineElement;
	propertyPath: AnimationPropertyPath;
}): AnimationValue | null {
	const definition = getAnimationPropertyDefinition({ propertyPath });
	if (!definition.supportsElement({ element })) {
		return null;
	}
	return definition.getValue({ element });
}

export function withElementBaseValueForProperty({
	element,
	propertyPath,
	value,
}: {
	element: TimelineElement;
	propertyPath: AnimationPropertyPath;
	value: AnimationValue;
}): TimelineElement {
	const coercedValue = coerceAnimationValueForProperty({ propertyPath, value });
	if (coercedValue === null) {
		return element;
	}
	const definition = getAnimationPropertyDefinition({ propertyPath });
	if (!definition.supportsElement({ element })) {
		return element;
	}
	return definition.setValue({ element, value: coercedValue });
}

export function getDefaultInterpolationForProperty({
	propertyPath,
}: {
	propertyPath: AnimationPropertyPath;
}): AnimationInterpolation {
	const propertyDefinition = getAnimationPropertyDefinition({ propertyPath });
	return propertyDefinition.defaultInterpolation;
}

function applyNumericSpec({
	value,
	numericRange,
}: {
	value: number;
	numericRange: NumericSpec | undefined;
}): number {
	if (!numericRange) {
		return value;
	}

	const steppedValue =
		numericRange.step != null
			? snapToStep({ value, step: numericRange.step })
			: value;
	const minValue = numericRange.min ?? Number.NEGATIVE_INFINITY;
	const maxValue = numericRange.max ?? Number.POSITIVE_INFINITY;
	return Math.min(maxValue, Math.max(minValue, steppedValue));
}

export function coerceAnimationValueForProperty({
	propertyPath,
	value,
}: {
	propertyPath: AnimationPropertyPath;
	value: AnimationValue;
}): AnimationValue | null {
	const propertyDefinition = getAnimationPropertyDefinition({ propertyPath });

	if (propertyDefinition.valueKind === "number") {
		if (typeof value !== "number" || Number.isNaN(value)) {
			return null;
		}

		return applyNumericSpec({
			value,
			numericRange: propertyDefinition.numericRange,
		});
	}

	if (propertyDefinition.valueKind === "color") {
		return typeof value === "string" ? value : null;
	}

	if (propertyDefinition.valueKind === "vector") {
		return isVectorValue(value) ? value : null;
	}

	if (typeof value === "string" || typeof value === "boolean") {
		return value as DiscreteValue;
	}

	return null;
}

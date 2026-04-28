import type {
	AnimationBindingKind,
	AnimationInterpolation,
	AnimationPropertyPath,
	AnimationValue,
} from "@/animation/types";
import { parseColorToLinearRgba } from "./binding-values";
import type { TimelineElement } from "@/timeline";
import { MIN_TRANSFORM_SCALE } from "@/animation/transform";
import {
	CORNER_RADIUS_MAX,
	CORNER_RADIUS_MIN,
} from "@/text/background";
import {
	canElementHaveAudio,
	isVisualElement,
} from "@/timeline/element-utils";
import { VOLUME_DB_MAX, VOLUME_DB_MIN } from "@/timeline/audio-constants";
import { DEFAULTS } from "@/timeline/defaults";
import { snapToStep } from "@/utils/math";

export interface NumericSpec {
	min?: number;
	max?: number;
	step?: number;
}

export interface AnimationPropertyDefinition {
	kind: AnimationBindingKind;
	defaultInterpolation: AnimationInterpolation;
	numericRanges?: Partial<Record<string, NumericSpec>>;
	supportsElement: ({ element }: { element: TimelineElement }) => boolean;
	getValue: ({ element }: { element: TimelineElement }) => AnimationValue | null;
	coerceValue: ({ value }: { value: AnimationValue }) => AnimationValue | null;
	// Apply `value` to `element` for this property. Coerces the value through
	// `coerceValue` and verifies element support; returns `element` unchanged
	// if either fails. Cannot be bypassed — there is no kind-narrow `setValue`
	// on the public surface, so callers can't apply an unvalidated value.
	applyValue: ({
		element,
		value,
	}: {
		element: TimelineElement;
		value: AnimationValue;
	}) => TimelineElement;
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

function coerceNumberValue({
	value,
	numericRange,
}: {
	value: AnimationValue;
	numericRange?: NumericSpec;
}): number | null {
	if (typeof value !== "number" || Number.isNaN(value)) {
		return null;
	}

	return applyNumericSpec({ value, numericRange });
}

function coerceColorValue({
	value,
}: {
	value: AnimationValue;
}): string | null {
	return typeof value === "string" && parseColorToLinearRgba({ color: value })
		? value
		: null;
}

function createNumberPropertyDefinition({
	numericRange,
	supportsElement,
	getValue,
	setValue,
}: {
	numericRange?: NumericSpec;
	supportsElement: AnimationPropertyDefinition["supportsElement"];
	getValue: AnimationPropertyDefinition["getValue"];
	setValue: ({
		element,
		value,
	}: {
		element: TimelineElement;
		value: number;
	}) => TimelineElement;
}): AnimationPropertyDefinition {
	return {
		kind: "number",
		defaultInterpolation: "linear",
		numericRanges: numericRange ? { value: numericRange } : undefined,
		supportsElement,
		getValue,
		coerceValue: ({ value }) => coerceNumberValue({ value, numericRange }),
		applyValue: ({ element, value }) => {
			if (!supportsElement({ element })) {
				return element;
			}
			const coerced = coerceNumberValue({ value, numericRange });
			if (coerced === null) {
				return element;
			}
			return setValue({ element, value: coerced });
		},
	};
}

function createColorPropertyDefinition({
	supportsElement,
	getValue,
	setValue,
}: {
	supportsElement: AnimationPropertyDefinition["supportsElement"];
	getValue: AnimationPropertyDefinition["getValue"];
	setValue: ({
		element,
		value,
	}: {
		element: TimelineElement;
		value: string;
	}) => TimelineElement;
}): AnimationPropertyDefinition {
	return {
		kind: "color",
		defaultInterpolation: "linear",
		supportsElement,
		getValue,
		coerceValue: ({ value }) => coerceColorValue({ value }),
		applyValue: ({ element, value }) => {
			if (!supportsElement({ element })) {
				return element;
			}
			const coerced = coerceColorValue({ value });
			if (coerced === null) {
				return element;
			}
			return setValue({ element, value: coerced });
		},
	};
}

const ANIMATION_PROPERTY_REGISTRY: Record<
	AnimationPropertyPath,
	AnimationPropertyDefinition
> = {
	"transform.positionX": createNumberPropertyDefinition({
		numericRange: { step: 1 },
		supportsElement: ({ element }) => isVisualElement(element),
		getValue: ({ element }) =>
			isVisualElement(element) ? element.transform.position.x : null,
		setValue: ({ element, value }) =>
			isVisualElement(element)
				? {
						...element,
						transform: {
							...element.transform,
							position: { ...element.transform.position, x: value },
						},
					}
				: element,
	}),
	"transform.positionY": createNumberPropertyDefinition({
		numericRange: { step: 1 },
		supportsElement: ({ element }) => isVisualElement(element),
		getValue: ({ element }) =>
			isVisualElement(element) ? element.transform.position.y : null,
		setValue: ({ element, value }) =>
			isVisualElement(element)
				? {
						...element,
						transform: {
							...element.transform,
							position: { ...element.transform.position, y: value },
						},
					}
				: element,
	}),
	"transform.scaleX": createNumberPropertyDefinition({
		numericRange: { min: MIN_TRANSFORM_SCALE, step: 0.01 },
		supportsElement: ({ element }) => isVisualElement(element),
		getValue: ({ element }) =>
			isVisualElement(element) ? element.transform.scaleX : null,
		setValue: ({ element, value }) =>
			isVisualElement(element)
				? {
						...element,
						transform: { ...element.transform, scaleX: value },
					}
				: element,
	}),
	"transform.scaleY": createNumberPropertyDefinition({
		numericRange: { min: MIN_TRANSFORM_SCALE, step: 0.01 },
		supportsElement: ({ element }) => isVisualElement(element),
		getValue: ({ element }) =>
			isVisualElement(element) ? element.transform.scaleY : null,
		setValue: ({ element, value }) =>
			isVisualElement(element)
				? {
						...element,
						transform: { ...element.transform, scaleY: value },
					}
				: element,
	}),
	"transform.rotate": createNumberPropertyDefinition({
		numericRange: { min: -360, max: 360, step: 1 },
		supportsElement: ({ element }) => isVisualElement(element),
		getValue: ({ element }) =>
			isVisualElement(element) ? element.transform.rotate : null,
		setValue: ({ element, value }) =>
			isVisualElement(element)
				? {
						...element,
						transform: { ...element.transform, rotate: value },
					}
				: element,
	}),
	opacity: createNumberPropertyDefinition({
		numericRange: { min: 0, max: 1, step: 0.01 },
		supportsElement: ({ element }) => isVisualElement(element),
		getValue: ({ element }) =>
			isVisualElement(element) ? element.opacity : null,
		setValue: ({ element, value }) =>
			isVisualElement(element) ? { ...element, opacity: value } : element,
	}),
	volume: createNumberPropertyDefinition({
		numericRange: { min: VOLUME_DB_MIN, max: VOLUME_DB_MAX, step: 0.01 },
		supportsElement: ({ element }) => canElementHaveAudio(element),
		getValue: ({ element }) =>
			canElementHaveAudio(element) ? element.volume ?? 0 : null,
		setValue: ({ element, value }) =>
			canElementHaveAudio(element) ? { ...element, volume: value } : element,
	}),
	color: createColorPropertyDefinition({
		supportsElement: ({ element }) => element.type === "text",
		getValue: ({ element }) => (element.type === "text" ? element.color : null),
		setValue: ({ element, value }) =>
			element.type === "text" ? { ...element, color: value } : element,
	}),
	"background.color": createColorPropertyDefinition({
		supportsElement: ({ element }) => element.type === "text",
		getValue: ({ element }) =>
			element.type === "text" ? element.background.color : null,
		setValue: ({ element, value }) =>
			element.type === "text"
				? {
						...element,
						background: { ...element.background, color: value },
					}
				: element,
	}),
	"background.paddingX": createNumberPropertyDefinition({
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
						background: { ...element.background, paddingX: value },
					}
				: element,
	}),
	"background.paddingY": createNumberPropertyDefinition({
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
						background: { ...element.background, paddingY: value },
					}
				: element,
	}),
	"background.offsetX": createNumberPropertyDefinition({
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
						background: { ...element.background, offsetX: value },
					}
				: element,
	}),
	"background.offsetY": createNumberPropertyDefinition({
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
						background: { ...element.background, offsetY: value },
					}
				: element,
	}),
	"background.cornerRadius": createNumberPropertyDefinition({
		numericRange: {
			min: CORNER_RADIUS_MIN,
			max: CORNER_RADIUS_MAX,
			step: 1,
		},
		supportsElement: ({ element }) => element.type === "text",
		getValue: ({ element }) =>
			element.type === "text"
				? (element.background.cornerRadius ?? CORNER_RADIUS_MIN)
				: null,
		setValue: ({ element, value }) =>
			element.type === "text"
				? {
						...element,
						background: { ...element.background, cornerRadius: value },
					}
				: element,
	}),
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
	const definition = getAnimationPropertyDefinition({ propertyPath });
	return definition.applyValue({ element, value });
}

export function getDefaultInterpolationForProperty({
	propertyPath,
}: {
	propertyPath: AnimationPropertyPath;
}): AnimationInterpolation {
	const propertyDefinition = getAnimationPropertyDefinition({ propertyPath });
	return propertyDefinition.defaultInterpolation;
}

export function coerceAnimationValueForProperty({
	propertyPath,
	value,
}: {
	propertyPath: AnimationPropertyPath;
	value: AnimationValue;
}): AnimationValue | null {
	const propertyDefinition = getAnimationPropertyDefinition({ propertyPath });
	return propertyDefinition.coerceValue({ value });
}

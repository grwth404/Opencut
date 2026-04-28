import type {
	AnimationBindingKind,
	AnimationInterpolation,
	AnimationPropertyPath,
	AnimationValue,
	NumericSpec,
} from "@/animation/types";
import {
	coerceParamValue,
	getParamDefaultInterpolation,
	getParamNumericRange,
	getParamValueKind,
	type ParamDefinition,
} from "@/params";
import {
	getBuiltInElementParams,
	getElementParam,
	readElementParamValue,
	writeElementParamValue,
} from "@/params/registry";
import type { ElementType, TimelineElement } from "@/timeline";

export interface AnimationPropertyDefinition {
	kind: AnimationBindingKind;
	defaultInterpolation: AnimationInterpolation;
	numericRanges?: Partial<Record<string, NumericSpec>>;
	supportsElement: ({ element }: { element: TimelineElement }) => boolean;
	getValue: ({ element }: { element: TimelineElement }) => AnimationValue | null;
	coerceValue: ({ value }: { value: AnimationValue }) => AnimationValue | null;
	applyValue: ({
		element,
		value,
	}: {
		element: TimelineElement;
		value: AnimationValue;
	}) => TimelineElement;
}

function getFallbackParam({
	propertyPath,
}: {
	propertyPath: AnimationPropertyPath;
}): ParamDefinition | null {
	const elementTypes: ElementType[] = [
		"video",
		"image",
		"text",
		"sticker",
		"graphic",
		"audio",
	];
	for (const type of elementTypes) {
		const param =
			getBuiltInElementParams({ type }).find(
				(candidate) => candidate.key === propertyPath,
			) ?? null;
		if (param) {
			return param;
		}
	}
	return null;
}

function buildDefinition({
	propertyPath,
	element,
}: {
	propertyPath: AnimationPropertyPath;
	element?: TimelineElement;
}): AnimationPropertyDefinition | null {
	const param = element
		? getElementParam({ element, key: propertyPath })
		: getFallbackParam({ propertyPath });
	if (!param || param.keyframable === false) {
		return null;
	}

	const range = getParamNumericRange({ param });

	return {
		kind: getParamValueKind({ param }),
		defaultInterpolation: getParamDefaultInterpolation({ param }),
		numericRanges: range ? { value: range } : undefined,
		supportsElement: ({ element: candidate }) =>
			getElementParam({ element: candidate, key: propertyPath }) !== null,
		getValue: ({ element: candidate }) =>
			readElementParamValue({ element: candidate, param }),
		coerceValue: ({ value }) => coerceParamValue({ param, value }),
		applyValue: ({ element: candidate, value }) => {
			const targetParam = getElementParam({
				element: candidate,
				key: propertyPath,
			});
			if (!targetParam) {
				return candidate;
			}
			const coercedValue = coerceParamValue({
				param: targetParam,
				value,
			});
			if (coercedValue === null) {
				return candidate;
			}
			return writeElementParamValue({
				element: candidate,
				param: targetParam,
				value: coercedValue,
			});
		},
	};
}

export function isAnimationPropertyPath(
	propertyPath: string,
): propertyPath is AnimationPropertyPath {
	return !propertyPath.startsWith("params.") && !propertyPath.startsWith("effects.");
}

export function getAnimationPropertyDefinition({
	propertyPath,
	element,
}: {
	propertyPath: AnimationPropertyPath;
	element?: TimelineElement;
}): AnimationPropertyDefinition {
	const definition = buildDefinition({ propertyPath, element });
	if (!definition) {
		throw new Error(`Unknown animation property for element: ${propertyPath}`);
	}
	return definition;
}

export function supportsAnimationProperty({
	element,
	propertyPath,
}: {
	element: TimelineElement;
	propertyPath: AnimationPropertyPath;
}): boolean {
	return getElementParam({ element, key: propertyPath }) !== null;
}

export function getElementBaseValueForProperty({
	element,
	propertyPath,
}: {
	element: TimelineElement;
	propertyPath: AnimationPropertyPath;
}): AnimationValue | null {
	const param = getElementParam({ element, key: propertyPath });
	if (!param) {
		return null;
	}
	return readElementParamValue({ element, param });
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
	const param = getElementParam({ element, key: propertyPath });
	if (!param) {
		return element;
	}
	const coercedValue = coerceParamValue({ param, value });
	if (coercedValue === null) {
		return element;
	}
	return writeElementParamValue({ element, param, value: coercedValue });
}

export function getDefaultInterpolationForProperty({
	propertyPath,
	element,
}: {
	propertyPath: AnimationPropertyPath;
	element?: TimelineElement;
}): AnimationInterpolation {
	return getAnimationPropertyDefinition({ propertyPath, element })
		.defaultInterpolation;
}

export function coerceAnimationValueForProperty({
	propertyPath,
	value,
	element,
}: {
	propertyPath: AnimationPropertyPath;
	value: AnimationValue;
	element?: TimelineElement;
}): AnimationValue | null {
	return getAnimationPropertyDefinition({ propertyPath, element }).coerceValue({
		value,
	});
}

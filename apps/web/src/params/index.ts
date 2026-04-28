import { snapToStep } from "@/utils/math";

export type ParamValue = number | string | boolean;
export type ParamValues = Record<string, ParamValue>;

export type ParamGroup = "stroke";

interface BaseParamDefinition<TKey extends string = string> {
	key: TKey;
	label: string;
	group?: ParamGroup;
	keyframable?: boolean;
	dependencies?: Array<{ param: string; equals: ParamValue }>;
}

export interface NumberParamDefinition<TKey extends string = string>
	extends BaseParamDefinition<TKey> {
	type: "number";
	default: number;
	min: number;
	max?: number;
	step: number;
	/** When set, min/max/step are in display space. display = stored * displayMultiplier. */
	displayMultiplier?: number;
	/** Show as percentage of max. min/max/step/default stay in stored space. */
	unit?: "percent";
	/** Short label shown as the scrub handle icon in the number field (e.g. "W", "R"). */
	shortLabel?: string;
}

export interface BooleanParamDefinition<TKey extends string = string>
	extends BaseParamDefinition<TKey> {
	type: "boolean";
	default: boolean;
}

export interface ColorParamDefinition<TKey extends string = string>
	extends BaseParamDefinition<TKey> {
	type: "color";
	default: string;
}

export interface SelectParamDefinition<TKey extends string = string>
	extends BaseParamDefinition<TKey> {
	type: "select";
	default: string;
	options: Array<{ value: string; label: string }>;
}

export interface TextParamDefinition<TKey extends string = string>
	extends BaseParamDefinition<TKey> {
	type: "text";
	default: string;
}

export interface FontParamDefinition<TKey extends string = string>
	extends BaseParamDefinition<TKey> {
	type: "font";
	default: string;
}

export type ParamDefinition<TKey extends string = string> =
	| NumberParamDefinition<TKey>
	| BooleanParamDefinition<TKey>
	| ColorParamDefinition<TKey>
	| SelectParamDefinition<TKey>
	| TextParamDefinition<TKey>
	| FontParamDefinition<TKey>;

export function getParamValueKind({
	param,
}: {
	param: ParamDefinition;
}): "number" | "color" | "discrete" {
	if (param.type === "number") {
		return "number";
	}
	if (param.type === "color") {
		return "color";
	}
	return "discrete";
}

export function getParamDefaultInterpolation({
	param,
}: {
	param: ParamDefinition;
}): "linear" | "hold" {
	return param.type === "number" || param.type === "color" ? "linear" : "hold";
}

export function getParamNumericRange({
	param,
}: {
	param: ParamDefinition;
}): { min?: number; max?: number; step?: number } | undefined {
	if (param.type !== "number") {
		return undefined;
	}

	return {
		min: param.min,
		max: param.max,
		step: param.step,
	};
}

export function coerceParamValue({
	param,
	value,
}: {
	param: ParamDefinition;
	value: unknown;
}): ParamValue | null {
	if (param.type === "number") {
		if (typeof value !== "number" || Number.isNaN(value)) {
			return null;
		}

		const steppedValue = snapToStep({ value, step: param.step });
		const maxValue = param.max ?? Number.POSITIVE_INFINITY;
		return Math.min(maxValue, Math.max(param.min, steppedValue));
	}

	if (param.type === "boolean") {
		return typeof value === "boolean" ? value : null;
	}

	if (param.type === "color" || param.type === "text" || param.type === "font") {
		return typeof value === "string" ? value : null;
	}

	if (typeof value !== "string") {
		return null;
	}

	return param.options.some((option) => option.value === value) ? value : null;
}

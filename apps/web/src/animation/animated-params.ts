import { snapToStep } from "@/utils/math";
import type { ParamDefinition } from "@/params";
import type { DynamicAnimationPathValue, NumericSpec } from "./types";

export function getAnimationParamValueKind({
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

export function getAnimationParamDefaultInterpolation({
	param,
}: {
	param: ParamDefinition;
}): "linear" | "hold" {
	return param.type === "number" || param.type === "color" ? "linear" : "hold";
}

export function getAnimationParamNumericRange({
	param,
}: {
	param: ParamDefinition;
}): NumericSpec | undefined {
	if (param.type !== "number") {
		return undefined;
	}

	return {
		min: param.min,
		max: param.max,
		step: param.step,
	};
}

/**
 * `coerceAnimationParamValue` accepts `unknown` rather than a narrow
 * `DynamicAnimationPathValue` because it doubles as a runtime gate for
 * untrusted inputs (persisted state, paste payloads, programmatic updates).
 * The caller does not need to pre-validate; null means "this value cannot live
 * on this param".
 */
export function coerceAnimationParamValue({
	param,
	value,
}: {
	param: ParamDefinition;
	value: unknown;
}): DynamicAnimationPathValue | null {
	if (param.type === "number") {
		if (typeof value !== "number" || Number.isNaN(value)) {
			return null;
		}

		const steppedValue = snapToStep({ value, step: param.step });
		const minValue = param.min;
		const maxValue = param.max ?? Number.POSITIVE_INFINITY;
		return Math.min(maxValue, Math.max(minValue, steppedValue));
	}

	if (param.type === "color") {
		return typeof value === "string" ? value : null;
	}

	if (param.type === "boolean") {
		return typeof value === "boolean" ? value : null;
	}

	if (typeof value !== "string") {
		return null;
	}

	return param.options.some((option) => option.value === value) ? value : null;
}

import { describe, expect, test } from "bun:test";
import {
	coerceAnimationParamValue,
	getAnimationParamDefaultInterpolation,
	getAnimationParamNumericRange,
	getAnimationParamValueKind,
} from "@/animation/animated-params";

describe("animated params", () => {
	test("snaps and clamps number params", () => {
		expect(
			coerceAnimationParamValue({
				param: {
					key: "intensity",
					label: "Intensity",
					type: "number",
					default: 0,
					min: 0,
					max: 1,
					step: 0.25,
				},
				value: 0.62,
			}),
		).toBe(0.5);

		expect(
			coerceAnimationParamValue({
				param: {
					key: "intensity",
					label: "Intensity",
					type: "number",
					default: 0,
					min: 0,
					max: 1,
					step: 0.25,
				},
				value: 1.2,
			}),
		).toBe(1);
	});

	test("rejects NaN and non-number values for number params", () => {
		const param = {
			key: "intensity",
			label: "Intensity",
			type: "number" as const,
			default: 0,
			min: 0,
			max: 1,
			step: 0.25,
		};
		expect(coerceAnimationParamValue({ param, value: Number.NaN })).toBeNull();
		expect(coerceAnimationParamValue({ param, value: "0.5" })).toBeNull();
		expect(coerceAnimationParamValue({ param, value: true })).toBeNull();
	});

	test("passthrough with step <= 0 guard", () => {
		expect(
			coerceAnimationParamValue({
				param: {
					key: "x",
					label: "X",
					type: "number",
					default: 0,
					min: 0,
					step: 0,
				},
				value: 0.123,
			}),
		).toBe(0.123);
	});

	test("accepts valid select values", () => {
		const param = {
			key: "blend",
			label: "Blend",
			type: "select" as const,
			default: "normal",
			options: [
				{ value: "normal", label: "Normal" },
				{ value: "multiply", label: "Multiply" },
			],
		};
		expect(coerceAnimationParamValue({ param, value: "normal" })).toBe("normal");
		expect(coerceAnimationParamValue({ param, value: "multiply" })).toBe("multiply");
	});

	test("rejects select values outside the allowed options", () => {
		expect(
			coerceAnimationParamValue({
				param: {
					key: "blend",
					label: "Blend",
					type: "select",
					default: "normal",
					options: [
						{ value: "normal", label: "Normal" },
						{ value: "multiply", label: "Multiply" },
					],
				},
				value: "screen",
			}),
		).toBeNull();
	});

	test("rejects non-string select values", () => {
		const param = {
			key: "blend",
			label: "Blend",
			type: "select" as const,
			default: "normal",
			options: [{ value: "normal", label: "Normal" }],
		};
		expect(coerceAnimationParamValue({ param, value: 42 })).toBeNull();
		expect(coerceAnimationParamValue({ param, value: null })).toBeNull();
		expect(coerceAnimationParamValue({ param, value: undefined })).toBeNull();
	});

	test("boolean params accept booleans and reject other types", () => {
		const param = {
			key: "visible",
			label: "Visible",
			type: "boolean" as const,
			default: true,
		};
		expect(coerceAnimationParamValue({ param, value: true })).toBe(true);
		expect(coerceAnimationParamValue({ param, value: false })).toBe(false);
		expect(coerceAnimationParamValue({ param, value: 1 })).toBeNull();
		expect(coerceAnimationParamValue({ param, value: "true" })).toBeNull();
	});

	test("color params accept strings and reject other types", () => {
		const param = {
			key: "fill",
			label: "Fill",
			type: "color" as const,
			default: "#ffffff",
		};
		expect(coerceAnimationParamValue({ param, value: "#ff0000" })).toBe("#ff0000");
		expect(coerceAnimationParamValue({ param, value: 0xff0000 })).toBeNull();
		expect(coerceAnimationParamValue({ param, value: null })).toBeNull();
	});

	test("getAnimationParamValueKind maps param type to binding kind", () => {
		expect(
			getAnimationParamValueKind({
				param: {
					key: "n",
					label: "N",
					type: "number",
					default: 0,
					min: 0,
					step: 1,
				},
			}),
		).toBe("number");
		expect(
			getAnimationParamValueKind({
				param: { key: "c", label: "C", type: "color", default: "#fff" },
			}),
		).toBe("color");
		expect(
			getAnimationParamValueKind({
				param: { key: "b", label: "B", type: "boolean", default: false },
			}),
		).toBe("discrete");
		expect(
			getAnimationParamValueKind({
				param: {
					key: "s",
					label: "S",
					type: "select",
					default: "a",
					options: [{ value: "a", label: "A" }],
				},
			}),
		).toBe("discrete");
	});

	test("getAnimationParamDefaultInterpolation is linear for continuous, hold for discrete", () => {
		expect(
			getAnimationParamDefaultInterpolation({
				param: {
					key: "n",
					label: "N",
					type: "number",
					default: 0,
					min: 0,
					step: 1,
				},
			}),
		).toBe("linear");
		expect(
			getAnimationParamDefaultInterpolation({
				param: { key: "c", label: "C", type: "color", default: "#fff" },
			}),
		).toBe("linear");
		expect(
			getAnimationParamDefaultInterpolation({
				param: { key: "b", label: "B", type: "boolean", default: false },
			}),
		).toBe("hold");
		expect(
			getAnimationParamDefaultInterpolation({
				param: {
					key: "s",
					label: "S",
					type: "select",
					default: "a",
					options: [{ value: "a", label: "A" }],
				},
			}),
		).toBe("hold");
	});

	test("getAnimationParamNumericRange returns spec for number params, undefined otherwise", () => {
		expect(
			getAnimationParamNumericRange({
				param: {
					key: "intensity",
					label: "Intensity",
					type: "number",
					default: 0.5,
					min: 0,
					max: 1,
					step: 0.1,
				},
			}),
		).toEqual({ min: 0, max: 1, step: 0.1 });
		expect(
			getAnimationParamNumericRange({
				param: { key: "c", label: "C", type: "color", default: "#fff" },
			}),
		).toBeUndefined();
		expect(
			getAnimationParamNumericRange({
				param: { key: "b", label: "B", type: "boolean", default: false },
			}),
		).toBeUndefined();
	});
});

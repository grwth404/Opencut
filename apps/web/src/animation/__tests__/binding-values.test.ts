import { describe, expect, test } from "bun:test";
import {
	composeAnimationValue,
	createAnimationBinding,
} from "@/animation/binding-values";

describe("binding values", () => {
	test("formats composed animated colors as hex", () => {
		const binding = createAnimationBinding({
			path: "color",
			kind: "color",
		});

		expect(
			composeAnimationValue({
				binding,
				componentValues: {
					r: 1,
					g: 0,
					b: 0,
					a: 1,
				},
			}),
		).toBe("#ff0000");
	});
});

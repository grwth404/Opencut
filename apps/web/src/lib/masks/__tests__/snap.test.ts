import { describe, expect, test } from "bun:test";
import { getSplitMaskStrokeSegment } from "@/lib/masks/definitions/split";
import { getMaskSnapGeometry } from "@/lib/masks/geometry";
import { snapMaskInteraction } from "@/lib/masks/snap";
import type { ElementBounds } from "@/lib/preview/element-bounds";
import type { RectangleMaskParams, SplitMaskParams } from "@/lib/masks/types";

const bounds: ElementBounds = {
	cx: 200,
	cy: 150,
	width: 200,
	height: 100,
	rotation: 0,
};

const canvasSize = {
	width: 400,
	height: 300,
};

const snapThreshold = {
	x: 8,
	y: 8,
};

function buildSplitParams(
	overrides: Partial<SplitMaskParams> = {},
): SplitMaskParams {
	return {
		feather: 0,
		inverted: false,
		strokeColor: "#ffffff",
		strokeWidth: 0,
		strokeAlign: "center",
		centerX: 0,
		centerY: 0,
		rotation: 0,
		...overrides,
	};
}

function buildRectangleParams(
	overrides: Partial<RectangleMaskParams> = {},
): RectangleMaskParams {
	return {
		feather: 0,
		inverted: false,
		strokeColor: "#ffffff",
		strokeWidth: 0,
		strokeAlign: "center",
		centerX: 0,
		centerY: 0,
		width: 0.4,
		height: 0.2,
		rotation: 0,
		scale: 1,
		...overrides,
	};
}

function sortSegment(
	segment: [{ x: number; y: number }, { x: number; y: number }],
): [{ x: number; y: number }, { x: number; y: number }] {
	return [...segment].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x)) as [
		{ x: number; y: number },
		{ x: number; y: number },
	];
}

describe("mask geometry", () => {
	test("resolves split mask center from centerX and centerY", () => {
		expect(
			getMaskSnapGeometry({
				params: buildSplitParams({
					centerX: 0.25,
					centerY: -0.5,
					rotation: 45,
				}),
				bounds,
			}),
		).toEqual({
			position: { x: 50, y: -50 },
			size: { width: 0, height: 0 },
			rotation: 45,
		});
	});

	test("resolves box mask center and size from centerX and centerY", () => {
		expect(
			getMaskSnapGeometry({
				params: buildRectangleParams({
					centerX: -0.25,
					centerY: 0.5,
					width: 0.5,
					height: 0.6,
					rotation: 30,
				}),
				bounds,
			}),
		).toEqual({
			position: { x: -50, y: 50 },
			size: { width: 100, height: 60 },
			rotation: 30,
		});
	});

	test("returns a vertical split stroke segment for rotation 0", () => {
		const segment = getSplitMaskStrokeSegment({
			resolvedParams: buildSplitParams(),
			width: bounds.width,
			height: bounds.height,
		});

		expect(segment).not.toBeNull();
		if (!segment) {
			throw new Error("Expected split stroke segment for rotation 0");
		}
		expect(sortSegment(segment)).toEqual([
			{ x: bounds.width / 2, y: 0 },
			{ x: bounds.width / 2, y: bounds.height },
		]);
	});

	test("returns a horizontal split stroke segment for rotation 90", () => {
		const segment = getSplitMaskStrokeSegment({
			resolvedParams: buildSplitParams({ rotation: 90 }),
			width: bounds.width,
			height: bounds.height,
		});

		expect(segment).not.toBeNull();
		if (!segment) {
			throw new Error("Expected split stroke segment for rotation 90");
		}
		expect(sortSegment(segment)).toEqual([
			{ x: 0, y: bounds.height / 2 },
			{ x: bounds.width, y: bounds.height / 2 },
		]);
	});
});

describe("mask snapping", () => {
	test("snaps split mask movement using the shared position pipeline", () => {
		const result = snapMaskInteraction({
			handleId: "position",
			startParams: buildSplitParams({
				centerX: 0.03,
				centerY: -0.04,
			}),
			proposedParams: buildSplitParams({
				centerX: 0.03,
				centerY: -0.04,
			}),
			bounds,
			canvasSize,
			snapThreshold,
		});

		expect(result.params.centerX).toBe(0);
		expect(result.params.centerY).toBe(0);
		expect(result.activeLines).toEqual([
			{ type: "vertical", position: 0 },
			{ type: "horizontal", position: 0 },
		]);
	});

	test("snaps box mask movement against element center and edges", () => {
		const result = snapMaskInteraction({
			handleId: "position",
			startParams: buildRectangleParams(),
			proposedParams: buildRectangleParams({
				centerX: 0.29,
				centerY: 0.03,
			}),
			bounds,
			canvasSize,
			snapThreshold,
		});

		expect(result.params.centerX).toBeCloseTo(0.3);
		expect(result.params.centerY).toBe(0);
		expect(result.activeLines).toEqual([
			{ type: "vertical", position: 100 },
			{ type: "horizontal", position: 0 },
		]);
	});

	test("snaps mask rotation through the shared rotation path", () => {
		const result = snapMaskInteraction({
			handleId: "rotation",
			startParams: buildRectangleParams(),
			proposedParams: buildRectangleParams({
				rotation: 88,
			}),
			bounds,
			canvasSize,
			snapThreshold,
		});

		expect(result.params.rotation).toBe(90);
		expect(result.activeLines).toEqual([]);
	});

	test("snaps edge resize for box masks", () => {
		const result = snapMaskInteraction({
			handleId: "right",
			startParams: buildRectangleParams(),
			proposedParams: buildRectangleParams({
				width: 0.98,
			}),
			bounds,
			canvasSize,
			snapThreshold,
		});

		expect(result.params.width).toBe(1);
		expect(result.activeLines).toEqual([{ type: "vertical", position: 100 }]);
	});

	test("snaps corner resize for box masks", () => {
		const result = snapMaskInteraction({
			handleId: "bottom-right",
			startParams: buildRectangleParams(),
			proposedParams: buildRectangleParams({
				width: 0.99,
				height: 0.495,
			}),
			bounds,
			canvasSize,
			snapThreshold,
		});

		expect(result.params.width).toBe(1);
		expect(result.params.height).toBe(0.5);
		expect(result.activeLines).toEqual([{ type: "vertical", position: 100 }]);
	});
});

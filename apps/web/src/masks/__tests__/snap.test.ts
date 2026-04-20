import { describe, expect, test } from "bun:test";
import {
	findClosestPointOnCustomMaskSegment,
	getCustomMaskClosedStateAfterPointRemoval,
	insertPointIntoCustomMaskSegment,
	removeCustomMaskPoints,
} from "@/masks/custom-path";
import {
	appendPointToCustomMask,
	customMaskDefinition,
	insertPointOnCustomMaskSegment,
} from "@/masks/definitions/custom";
import { getSplitMaskStrokeSegment } from "@/masks/definitions/split";
import { textMaskDefinition } from "@/masks/definitions/text";
import { getMaskSnapGeometry } from "@/masks/geometry";
import { snapMaskInteraction } from "@/masks/snap";
import type { ElementBounds } from "@/preview/element-bounds";
import type {
	CustomMaskParams,
	RectangleMaskParams,
	SplitMaskParams,
	TextMaskParams,
} from "@/masks/types";

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

function buildTextMaskParams(
	overrides: Partial<TextMaskParams> = {},
): TextMaskParams {
	return {
		feather: 0,
		inverted: false,
		strokeColor: "#ffffff",
		strokeWidth: 0,
		strokeAlign: "center",
		content: "Mask",
		fontSize: 15,
		fontFamily: "Arial",
		fontWeight: "normal",
		fontStyle: "normal",
		textDecoration: "none",
		letterSpacing: 0,
		lineHeight: 1.2,
		centerX: 0,
		centerY: 0,
		rotation: 0,
		scale: 1,
		...overrides,
	};
}

function buildCustomMaskParams(
	overrides: Partial<CustomMaskParams> = {},
): CustomMaskParams {
	return {
		feather: 0,
		inverted: false,
		strokeColor: "#ffffff",
		strokeWidth: 0,
		strokeAlign: "center",
		path: [
			{
				id: "a",
				x: -0.2,
				y: -0.1,
				inX: 0,
				inY: 0,
				outX: 0,
				outY: 0,
			},
			{
				id: "b",
				x: 0.2,
				y: -0.1,
				inX: 0,
				inY: 0,
				outX: 0,
				outY: 0,
			},
			{
				id: "c",
				x: 0,
				y: 0.2,
				inX: 0,
				inY: 0,
				outX: 0,
				outY: 0,
			},
		],
		closed: true,
		centerX: 0,
		centerY: 0,
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

	test("snaps text mask movement using intrinsic text bounds", () => {
		const params = buildTextMaskParams({
			centerX: 0.03,
			centerY: -0.04,
		});
		const result = textMaskDefinition.interaction.snap?.({
			handleId: "position",
			startParams: params,
			proposedParams: params,
			bounds,
			canvasSize,
			snapThreshold,
		});

		expect(result?.params.centerX).toBe(0);
		expect(result?.params.centerY).toBe(0);
		expect(result?.activeLines).toEqual([
			{ type: "vertical", position: 0 },
			{ type: "horizontal", position: 0 },
		]);
	});

	test("snaps custom mask movement using path geometry bounds", () => {
		const params = buildCustomMaskParams({
			centerX: 0.03,
			centerY: -0.04,
		});
		const result = customMaskDefinition.interaction.snap?.({
			handleId: "position",
			startParams: params,
			proposedParams: params,
			bounds,
			canvasSize,
			snapThreshold,
		});

		expect(result?.params.centerX).toBe(0);
		expect(result?.params.centerY).toBe(0);
		expect(result?.activeLines).toEqual([
			{ type: "vertical", position: 0 },
			{ type: "horizontal", position: 0 },
		]);
	});

	test("marks blank text masks inactive", () => {
		expect(
			textMaskDefinition.isActive?.(
				buildTextMaskParams({
					content: "   ",
				}),
			),
		).toBe(false);
	});
});

describe("custom mask creation", () => {
	test("anchors the first point at the click position", () => {
		const params = buildCustomMaskParams({
			path: [],
			closed: false,
		});
		const next = appendPointToCustomMask({
			params,
			canvasPoint: { x: bounds.cx + 20, y: bounds.cy - 10 },
			bounds,
		});

		expect(next.centerX).toBeCloseTo(0.1);
		expect(next.centerY).toBeCloseTo(-0.1);
		expect(next.rotation).toBe(0);
		expect(next.scale).toBe(1);
		expect(next.path).toHaveLength(1);
	});
});

describe("custom mask point deletion", () => {
	test("removes the selected points by id", () => {
		const points = buildCustomMaskParams().path;
		const nextPoints = removeCustomMaskPoints({
			points,
			pointIds: ["b"],
		});

		expect(nextPoints.map((point) => point.id)).toEqual(["a", "c"]);
	});

	test("reopens a closed path once fewer than three points remain", () => {
		const points = buildCustomMaskParams().path;
		const nextPoints = removeCustomMaskPoints({
			points,
			pointIds: ["c"],
		});

		expect(
			getCustomMaskClosedStateAfterPointRemoval({
				wasClosed: true,
				remainingPointCount: nextPoints.length,
			}),
		).toBe(false);
	});
});

describe("custom mask point insertion", () => {
	test("finds the closest point on the clicked segment", () => {
		const params = buildCustomMaskParams();
		const points = params.path;
		const closestPoint = findClosestPointOnCustomMaskSegment({
			points,
			segmentIndex: 0,
			canvasPoint: { x: bounds.cx, y: bounds.cy - 10 },
			centerX: params.centerX,
			centerY: params.centerY,
			rotation: params.rotation,
			scale: params.scale,
			bounds,
			closed: params.closed,
		});

		expect(closestPoint).not.toBeNull();
		expect(closestPoint?.t).toBeCloseTo(0.5, 1);
		expect(closestPoint?.point.x).toBeCloseTo(bounds.cx, 4);
		expect(closestPoint?.point.y).toBeCloseTo(bounds.cy - 10, 4);
	});

	test("splits a segment into two segments at the insertion point", () => {
		const points = buildCustomMaskParams().path;
		const nextPoints = insertPointIntoCustomMaskSegment({
			points,
			segmentIndex: 0,
			pointId: "new",
			t: 0.5,
			closed: true,
		});

		expect(nextPoints.map((point) => point.id)).toEqual(["a", "new", "b", "c"]);
		expect(nextPoints[1]).toMatchObject({
			id: "new",
			x: 0,
			y: -0.1,
			inX: 0,
			inY: 0,
			outX: 0,
			outY: 0,
		});
	});

	test("builds updated custom mask params for a clicked segment", () => {
		const result = insertPointOnCustomMaskSegment({
			params: buildCustomMaskParams(),
			segmentIndex: 0,
			canvasPoint: { x: bounds.cx, y: bounds.cy - 10 },
			bounds,
			pointId: "new",
		});

		expect(result).not.toBeNull();
		const nextPoints = result?.params.path ?? [];
		expect(nextPoints).toHaveLength(4);
		expect(nextPoints.some((point) => point.id === "new")).toBe(true);
	});
});

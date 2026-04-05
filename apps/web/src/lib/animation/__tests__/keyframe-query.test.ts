import { describe, expect, test } from "bun:test";
import {
	getElementKeyframes,
	getKeyframeById,
	getKeyframeAtTime,
} from "@/lib/animation/keyframe-query";
import type {
	ElementAnimations,
	ScalarAnimationKey,
} from "@/lib/animation/types";

function createScalarKey({
	id,
	time,
	value,
}: {
	id: string;
	time: number;
	value: number;
}): ScalarAnimationKey {
	return {
		id,
		time,
		value,
		segmentToNext: "linear",
		tangentMode: "flat",
	};
}

function buildPositionAnimations({
	xKeys,
	yKeys,
}: {
	xKeys: ScalarAnimationKey[];
	yKeys: ScalarAnimationKey[];
}): ElementAnimations {
	return {
		bindings: {
			"transform.position": {
				path: "transform.position",
				kind: "vector2",
				components: [
					{ key: "x", channelId: "transform.position:x" },
					{ key: "y", channelId: "transform.position:y" },
				],
			},
		},
		channels: {
			"transform.position:x": {
				kind: "scalar",
				keys: xKeys,
			},
			"transform.position:y": {
				kind: "scalar",
				keys: yKeys,
			},
		},
	};
}

describe("keyframe query", () => {
	test("returns keyframes from any component channel", () => {
		const animations = buildPositionAnimations({
			xKeys: [createScalarKey({ id: "x-1", time: 1, value: 10 })],
			yKeys: [createScalarKey({ id: "y-2", time: 2, value: 20 })],
		});

		expect(
			getElementKeyframes({ animations }).map(({ id, time }) => ({
				id,
				time,
			})),
		).toEqual([
			{ id: "x-1", time: 1 },
			{ id: "y-2", time: 2 },
		]);
	});

	test("finds a keyframe at time on a non-primary component", () => {
		const animations = buildPositionAnimations({
			xKeys: [createScalarKey({ id: "x-1", time: 1, value: 10 })],
			yKeys: [createScalarKey({ id: "y-2", time: 2, value: 20 })],
		});

		expect(
			getKeyframeAtTime({
				animations,
				propertyPath: "transform.position",
				time: 2,
			}),
		).toMatchObject({
			id: "y-2",
			time: 2,
		});
	});

	test("finds a keyframe by id on a non-primary component", () => {
		const animations = buildPositionAnimations({
			xKeys: [createScalarKey({ id: "x-1", time: 1, value: 10 })],
			yKeys: [createScalarKey({ id: "y-2", time: 2, value: 20 })],
		});

		expect(
			getKeyframeById({
				animations,
				propertyPath: "transform.position",
				keyframeId: "y-2",
			}),
		).toMatchObject({
			id: "y-2",
			time: 2,
			value: { x: 10, y: 20 },
		});
	});

	test("prefers the primary component when multiple components share a time", () => {
		const animations = buildPositionAnimations({
			xKeys: [createScalarKey({ id: "x-1", time: 1, value: 10 })],
			yKeys: [createScalarKey({ id: "y-1", time: 1, value: 20 })],
		});

		expect(
			getElementKeyframes({ animations }).map(({ id, time }) => ({
				id,
				time,
			})),
		).toEqual([{ id: "x-1", time: 1 }]);
		expect(
			getKeyframeAtTime({
				animations,
				propertyPath: "transform.position",
				time: 1,
			}),
		).toMatchObject({
			id: "x-1",
			time: 1,
		});
	});
});

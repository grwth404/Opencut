import {
	getDefaultLeftHandle,
	getDefaultRightHandle,
} from "@/lib/animation/bezier";
import type {
	CurveHandle,
	NormalizedCubicBezier,
	ScalarAnimationKey,
} from "@/lib/animation/types";

const VALUE_EPSILON = 1e-6;

function clamp01({ value }: { value: number }): number {
	return Math.max(0, Math.min(1, value));
}

export function getNormalizedCubicBezierForScalarSegment({
	leftKey,
	rightKey,
}: {
	leftKey: ScalarAnimationKey;
	rightKey: ScalarAnimationKey;
}): NormalizedCubicBezier | null {
	const spanTime = rightKey.time - leftKey.time;
	const spanValue = rightKey.value - leftKey.value;
	if (
		spanTime === 0 ||
		Math.abs(spanValue) <= VALUE_EPSILON
	) {
		return null;
	}

	const rightHandle =
		leftKey.rightHandle ?? getDefaultRightHandle({ leftKey, rightKey });
	const leftHandle =
		rightKey.leftHandle ?? getDefaultLeftHandle({ leftKey, rightKey });

	return [
		clamp01({ value: rightHandle.dt / spanTime }),
		rightHandle.dv / spanValue,
		clamp01({ value: 1 + leftHandle.dt / spanTime }),
		1 + leftHandle.dv / spanValue,
	];
}

export function getCurveHandlesForNormalizedCubicBezier({
	leftKey,
	rightKey,
	cubicBezier,
}: {
	leftKey: ScalarAnimationKey;
	rightKey: ScalarAnimationKey;
	cubicBezier: NormalizedCubicBezier;
}): {
	rightHandle: CurveHandle;
	leftHandle: CurveHandle;
} | null {
	const spanTime = rightKey.time - leftKey.time;
	const spanValue = rightKey.value - leftKey.value;
	if (
		spanTime === 0 ||
		Math.abs(spanValue) <= VALUE_EPSILON
	) {
		return null;
	}

	const [rawX1, y1, rawX2, y2] = cubicBezier;
	const x1 = clamp01({ value: rawX1 });
	const x2 = clamp01({ value: rawX2 });

	return {
		rightHandle: {
			dt: spanTime * x1,
			dv: spanValue * y1,
		},
		leftHandle: {
			dt: spanTime * (x2 - 1),
			dv: spanValue * (y2 - 1),
		},
	};
}

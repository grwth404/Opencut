import type { ElementBounds } from "@/lib/preview/element-bounds";
import type { SnapLine } from "@/lib/preview/preview-snap";
import { MIN_MASK_DIMENSION } from "@/constants/mask-constants";
import type { ParamValues } from "@/lib/params";
import type { RectangleMaskParams } from "@/lib/masks/types";

export function hasCenterParams(params: ParamValues): params is ParamValues & {
	centerX: number;
	centerY: number;
} {
	return (
		typeof params.centerX === "number" && typeof params.centerY === "number"
	);
}

export function isRectangleMaskParams(
	params: ParamValues,
): params is RectangleMaskParams {
	return (
		hasCenterParams(params) &&
		typeof params.width === "number" &&
		typeof params.height === "number" &&
		typeof params.rotation === "number" &&
		typeof params.scale === "number"
	);
}

export function getMaskLocalCenter({
	params,
	bounds,
}: {
	params: ParamValues;
	bounds: ElementBounds;
}): { x: number; y: number } | null {
	if (!hasCenterParams(params)) return null;

	return {
		x: params.centerX * bounds.width,
		y: params.centerY * bounds.height,
	};
}

export function setMaskLocalCenter({
	center,
	bounds,
}: {
	center: { x: number; y: number };
	bounds: ElementBounds;
}): Pick<ParamValues, "centerX" | "centerY"> {
	return {
		centerX: bounds.width === 0 ? 0 : center.x / bounds.width,
		centerY: bounds.height === 0 ? 0 : center.y / bounds.height,
	};
}

export function getMaskSnapGeometry({
	params,
	bounds,
}: {
	params: ParamValues;
	bounds: ElementBounds;
}): {
	position: { x: number; y: number };
	size: { width: number; height: number };
	rotation: number;
} | null {
	const position = getMaskLocalCenter({ params, bounds });
	if (!position) return null;

	if (isRectangleMaskParams(params)) {
		return {
			position,
			size: {
				width: Math.max(params.width, MIN_MASK_DIMENSION) * bounds.width,
				height: Math.max(params.height, MIN_MASK_DIMENSION) * bounds.height,
			},
			rotation: params.rotation,
		};
	}

	return {
		position,
		size: { width: 0, height: 0 },
		rotation: typeof params.rotation === "number" ? params.rotation : 0,
	};
}

export function toGlobalMaskSnapLines({
	lines,
	bounds,
	canvasSize,
}: {
	lines: SnapLine[];
	bounds: ElementBounds;
	canvasSize: { width: number; height: number };
}): SnapLine[] {
	const centerX = bounds.cx - canvasSize.width / 2;
	const centerY = bounds.cy - canvasSize.height / 2;

	return lines.map((line) =>
		line.type === "vertical"
			? {
					type: "vertical" as const,
					position: centerX + line.position,
				}
			: {
					type: "horizontal" as const,
					position: centerY + line.position,
				},
	);
}


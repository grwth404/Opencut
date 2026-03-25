import { FEATHER_HANDLE_SCALE } from "@/constants/mask-constants";
import type { ElementBounds } from "@/lib/preview/element-bounds";
import type {
	MaskFeatures,
	MaskHandlePosition,
	MaskLinePoints,
	MaskOverlayShape,
} from "@/lib/masks/types";
import type { ParamValues } from "@/lib/params";

const LINE_HANDLE_OFFSET_SCREEN_PX = 20;
const BOX_HANDLE_OFFSET_SCREEN_PX = 20;
const LINE_EXTENT_MULTIPLIER = 50;

const CURSOR = {
	rotate: "cursor-crosshair",
	resizeDiagonal: "cursor-nwse-resize",
	resizeHorizontal: "cursor-ew-resize",
	resizeVertical: "cursor-ns-resize",
} as const;

function getNumParam({
	params,
	key,
	fallback,
}: {
	params: ParamValues;
	key: string;
	fallback: number;
}): number {
	const value = params[key];
	return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
}

/**
 * The renderer defines the split line as:
 *   - normal direction: (cos(rotation), sin(rotation))
 *   - line direction (parallel to cut): (-sin(rotation), cos(rotation))
 *   - reference point: (centerX * width, centerY * height) from element centre
 *
 * So rotation=0 → normal points right → line runs vertically.
 */
export function getLineMaskLinePoints({
	centerX,
	centerY,
	rotation,
	bounds,
}: {
	centerX: number;
	centerY: number;
	rotation: number;
	bounds: ElementBounds;
}): MaskLinePoints {
	const angleRad = (rotation * Math.PI) / 180;
	const normalX = Math.cos(angleRad);
	const normalY = Math.sin(angleRad);
	const lineDirX = -normalY;
	const lineDirY = normalX;

	const cx = bounds.cx + centerX * bounds.width;
	const cy = bounds.cy + centerY * bounds.height;

	const extent = Math.max(bounds.width, bounds.height) * LINE_EXTENT_MULTIPLIER;

	return {
		start: {
			x: cx - lineDirX * extent,
			y: cy - lineDirY * extent,
		},
		end: {
			x: cx + lineDirX * extent,
			y: cy + lineDirY * extent,
		},
	};
}

export function getLineMaskHandlePositions({
	centerX,
	centerY,
	rotation,
	feather,
	bounds,
	displayScale,
}: {
	centerX: number;
	centerY: number;
	rotation: number;
	feather: number;
	bounds: ElementBounds;
	displayScale: number;
}): MaskHandlePosition[] {
	const angleRad = (rotation * Math.PI) / 180;
	const normalX = Math.cos(angleRad);
	const normalY = Math.sin(angleRad);

	const cx = bounds.cx + centerX * bounds.width;
	const cy = bounds.cy + centerY * bounds.height;

	const iconOffsetCanvas = LINE_HANDLE_OFFSET_SCREEN_PX / displayScale;
	const featherOffset = iconOffsetCanvas + feather * FEATHER_HANDLE_SCALE;

	return [
		{
			id: "rotation",
			x: cx + normalX * iconOffsetCanvas,
			y: cy + normalY * iconOffsetCanvas,
			cursor: CURSOR.rotate,
		},
		{
			id: "feather",
			x: cx - normalX * featherOffset,
			y: cy - normalY * featherOffset,
			cursor: CURSOR.resizeHorizontal,
		},
	];
}

function rotatePoint({
	localX,
	localY,
	cx,
	cy,
	angleRad,
}: {
	localX: number;
	localY: number;
	cx: number;
	cy: number;
	angleRad: number;
}): { x: number; y: number } {
	const cos = Math.cos(angleRad);
	const sin = Math.sin(angleRad);
	return {
		x: cx + localX * cos - localY * sin,
		y: cy + localX * sin + localY * cos,
	};
}

export function getBoxMaskHandlePositions({
	centerX,
	centerY,
	width,
	height,
	rotation,
	feather,
	sizeMode,
	bounds,
	displayScale,
}: {
	centerX: number;
	centerY: number;
	width: number;
	height: number;
	rotation: number;
	feather: number;
	sizeMode: MaskFeatures["sizeMode"];
	bounds: ElementBounds;
	displayScale: number;
}): MaskHandlePosition[] {
	const cx = bounds.cx + centerX * bounds.width;
	const cy = bounds.cy + centerY * bounds.height;
	const angleRad = (rotation * Math.PI) / 180;
	const halfWidth = (width * bounds.width) / 2;
	const halfHeight = (height * bounds.height) / 2;

	const handles: MaskHandlePosition[] = [];
	const handleOffsetCanvas = BOX_HANDLE_OFFSET_SCREEN_PX / displayScale;

	const rotHandle = rotatePoint({
		localX: 0,
		localY: -halfHeight - handleOffsetCanvas,
		cx,
		cy,
		angleRad,
	});
	handles.push({
		id: "rotation",
		x: rotHandle.x,
		y: rotHandle.y,
		cursor: CURSOR.rotate,
	});

	const featherHandle = rotatePoint({
		localX: 0,
		localY: halfHeight + handleOffsetCanvas + feather * FEATHER_HANDLE_SCALE,
		cx,
		cy,
		angleRad,
	});
	handles.push({
		id: "feather",
		x: featherHandle.x,
		y: featherHandle.y,
		cursor: CURSOR.resizeVertical,
	});

	if (sizeMode === "width-height") {
		const corners = [
			{ localX: -halfWidth, localY: -halfHeight, id: "top-left" },
			{ localX: halfWidth, localY: -halfHeight, id: "top-right" },
			{ localX: halfWidth, localY: halfHeight, id: "bottom-right" },
			{ localX: -halfWidth, localY: halfHeight, id: "bottom-left" },
		];
		for (const { localX, localY, id } of corners) {
			const point = rotatePoint({ localX, localY, cx, cy, angleRad });
			handles.push({
				id,
				x: point.x,
				y: point.y,
				cursor: CURSOR.resizeDiagonal,
			});
		}
		const right = rotatePoint({
			localX: halfWidth,
			localY: 0,
			cx,
			cy,
			angleRad,
		});
		const left = rotatePoint({
			localX: -halfWidth,
			localY: 0,
			cx,
			cy,
			angleRad,
		});
		const bottom = rotatePoint({
			localX: 0,
			localY: halfHeight,
			cx,
			cy,
			angleRad,
		});
		handles.push({
			id: "left",
			x: left.x,
			y: left.y,
			cursor: CURSOR.resizeHorizontal,
		});
		handles.push({
			id: "right",
			x: right.x,
			y: right.y,
			cursor: CURSOR.resizeHorizontal,
		});
		handles.push({
			id: "bottom",
			x: bottom.x,
			y: bottom.y,
			cursor: CURSOR.resizeVertical,
		});
	} else if (sizeMode === "height-only") {
		const top = rotatePoint({
			localX: 0,
			localY: -halfHeight,
			cx,
			cy,
			angleRad,
		});
		const bottom = rotatePoint({
			localX: 0,
			localY: halfHeight,
			cx,
			cy,
			angleRad,
		});
		handles.push({
			id: "top",
			x: top.x,
			y: top.y,
			cursor: CURSOR.resizeVertical,
		});
		handles.push({
			id: "bottom",
			x: bottom.x,
			y: bottom.y,
			cursor: CURSOR.resizeVertical,
		});
	} else if (sizeMode === "width-only") {
		const left = rotatePoint({
			localX: -halfWidth,
			localY: 0,
			cx,
			cy,
			angleRad,
		});
		const right = rotatePoint({
			localX: halfWidth,
			localY: 0,
			cx,
			cy,
			angleRad,
		});
		handles.push({
			id: "left",
			x: left.x,
			y: left.y,
			cursor: CURSOR.resizeHorizontal,
		});
		handles.push({
			id: "right",
			x: right.x,
			y: right.y,
			cursor: CURSOR.resizeHorizontal,
		});
	} else if (sizeMode === "uniform") {
		const point = rotatePoint({
			localX: halfWidth,
			localY: halfHeight,
			cx,
			cy,
			angleRad,
		});
		handles.push({
			id: "scale",
			x: point.x,
			y: point.y,
			cursor: CURSOR.resizeDiagonal,
		});
	}

	return handles;
}

type MaskHandleResolver = (args: {
	features: MaskFeatures;
	params: ParamValues;
	bounds: ElementBounds;
	displayScale: number;
}) => MaskHandlePosition[];

const rectangleHandles: MaskHandleResolver = ({
	features,
	params,
	bounds,
	displayScale,
}) =>
	getBoxMaskHandlePositions({
		centerX: getNumParam({ params, key: "centerX", fallback: 0 }),
		centerY: getNumParam({ params, key: "centerY", fallback: 0 }),
		width: getNumParam({ params, key: "width", fallback: 1 }),
		height: getNumParam({ params, key: "height", fallback: 1 }),
		rotation: getNumParam({ params, key: "rotation", fallback: 0 }),
		feather: getNumParam({ params, key: "feather", fallback: 0 }),
		sizeMode: features.sizeMode,
		bounds,
		displayScale,
	});

const HANDLE_RESOLVERS: Record<MaskOverlayShape, MaskHandleResolver> = {
	line: ({ params, bounds, displayScale }) =>
		getLineMaskHandlePositions({
			centerX: getNumParam({ params, key: "centerX", fallback: 0 }),
			centerY: getNumParam({ params, key: "centerY", fallback: 0 }),
			rotation: getNumParam({ params, key: "rotation", fallback: 0 }),
			feather: getNumParam({ params, key: "feather", fallback: 0 }),
			bounds,
			displayScale,
		}),
	box: rectangleHandles,
};

export function getMaskHandlePositions({
	overlayShape,
	features,
	params,
	bounds,
	displayScale,
}: {
	overlayShape: MaskOverlayShape;
	features: MaskFeatures;
	params: ParamValues;
	bounds: ElementBounds;
	displayScale: number;
}): MaskHandlePosition[] {
	return HANDLE_RESOLVERS[overlayShape]({
		features,
		params,
		bounds,
		displayScale,
	});
}

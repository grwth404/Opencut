import type { ElementBounds } from "@/preview/element-bounds";
import { MIN_MASK_DIMENSION } from "@/masks/dimensions";
import {
	snapPosition,
	snapRotation,
	snapScale,
	snapScaleAxes,
	type ScaleEdgePreference,
	type SnapLine,
} from "@/preview/preview-snap";
import type { RectangleMaskParams, SplitMaskParams } from "@/masks/types";
import {
	isRectangleMaskParams,
	getMaskSnapGeometry,
	setMaskLocalCenter,
	toGlobalMaskSnapLines,
} from "./geometry";

type SharedMaskParams = SplitMaskParams | RectangleMaskParams;

type MaskSnapResult<TParams extends SharedMaskParams> = {
	params: TParams;
	activeLines: SnapLine[];
};

const CORNER_SIZE_HANDLES = new Set([
	"top-left",
	"top-right",
	"bottom-left",
	"bottom-right",
]);

function getClampedRatio({
	next,
	base,
}: {
	next: number;
	base: number;
}): number {
	return (
		Math.max(next, MIN_MASK_DIMENSION) / Math.max(base, MIN_MASK_DIMENSION)
	);
}

function getPreferredEdges({
	handleId,
}: {
	handleId: string;
}): ScaleEdgePreference | undefined {
	const preferredEdges = {
		left:
			handleId === "left" ||
			handleId === "top-left" ||
			handleId === "bottom-left",
		right:
			handleId === "right" ||
			handleId === "top-right" ||
			handleId === "bottom-right",
		top:
			handleId === "top" || handleId === "top-left" || handleId === "top-right",
		bottom:
			handleId === "bottom" ||
			handleId === "bottom-left" ||
			handleId === "bottom-right",
	} satisfies ScaleEdgePreference;

	return Object.values(preferredEdges).some(Boolean)
		? preferredEdges
		: undefined;
}

function snapMaskPosition({
	proposedParams,
	bounds,
	canvasSize,
	snapThreshold,
}: {
	proposedParams: SharedMaskParams;
	bounds: ElementBounds;
	canvasSize: { width: number; height: number };
	snapThreshold: { x: number; y: number };
}): MaskSnapResult<SharedMaskParams> {
	const geometry = getMaskSnapGeometry({
		params: proposedParams,
		bounds,
	});
	if (!geometry) {
		return { params: proposedParams, activeLines: [] };
	}

	const { snappedPosition, activeLines } = snapPosition({
		proposedPosition: geometry.position,
		canvasSize: bounds,
		elementSize: geometry.size,
		rotation: geometry.rotation,
		snapThreshold,
	});

	return {
		params: {
			...proposedParams,
			...setMaskLocalCenter({
				center: snappedPosition,
				bounds,
			}),
		},
		activeLines: toGlobalMaskSnapLines({
			lines: activeLines,
			bounds,
			canvasSize,
		}),
	};
}

function snapMaskRotation({
	proposedParams,
}: {
	proposedParams: SharedMaskParams;
}): MaskSnapResult<SharedMaskParams> {
	if (typeof proposedParams.rotation !== "number") {
		return { params: proposedParams, activeLines: [] };
	}

	const { snappedRotation } = snapRotation({
		proposedRotation: proposedParams.rotation,
	});

	return {
		params: {
			...proposedParams,
			rotation: snappedRotation,
		},
		activeLines: [],
	};
}

function snapBoxMaskSize({
	handleId,
	startParams,
	proposedParams,
	bounds,
	canvasSize,
	snapThreshold,
}: {
	handleId: string;
	startParams: SharedMaskParams;
	proposedParams: SharedMaskParams;
	bounds: ElementBounds;
	canvasSize: { width: number; height: number };
	snapThreshold: { x: number; y: number };
}): MaskSnapResult<SharedMaskParams> {
	if (
		!isRectangleMaskParams(startParams) ||
		!isRectangleMaskParams(proposedParams)
	) {
		return { params: proposedParams, activeLines: [] };
	}

	const geometry = getMaskSnapGeometry({
		params: proposedParams,
		bounds,
	});
	if (!geometry) {
		return { params: proposedParams, activeLines: [] };
	}

	const localCanvasSize = bounds;
	const baseWidth =
		Math.max(startParams.width, MIN_MASK_DIMENSION) * bounds.width;
	const baseHeight =
		Math.max(startParams.height, MIN_MASK_DIMENSION) * bounds.height;
	const preferredEdges = getPreferredEdges({ handleId });

	if (handleId === "right" || handleId === "left") {
		const proposedScaleX = getClampedRatio({
			next: proposedParams.width,
			base: startParams.width,
		});
		const { x } = snapScaleAxes({
			proposedScaleX,
			proposedScaleY: 1,
			position: geometry.position,
			baseWidth,
			baseHeight,
			rotation: proposedParams.rotation,
			canvasSize: localCanvasSize,
			snapThreshold,
			preferredEdges,
		});

		return {
			params: {
				...proposedParams,
				width: Math.max(MIN_MASK_DIMENSION, startParams.width * x.snappedScale),
			},
			activeLines: toGlobalMaskSnapLines({
				lines: x.activeLines,
				bounds,
				canvasSize,
			}),
		};
	}

	if (handleId === "top" || handleId === "bottom") {
		const proposedScaleY = getClampedRatio({
			next: proposedParams.height,
			base: startParams.height,
		});
		const { y } = snapScaleAxes({
			proposedScaleX: 1,
			proposedScaleY,
			position: geometry.position,
			baseWidth,
			baseHeight,
			rotation: proposedParams.rotation,
			canvasSize: localCanvasSize,
			snapThreshold,
			preferredEdges,
		});

		return {
			params: {
				...proposedParams,
				height: Math.max(
					MIN_MASK_DIMENSION,
					startParams.height * y.snappedScale,
				),
			},
			activeLines: toGlobalMaskSnapLines({
				lines: y.activeLines,
				bounds,
				canvasSize,
			}),
		};
	}

	if (handleId === "scale") {
		const baseScale = Math.max(startParams.scale, MIN_MASK_DIMENSION);
		const proposedScale = getClampedRatio({
			next: proposedParams.scale,
			base: startParams.scale,
		});
		const { snappedScale, activeLines } = snapScale({
			proposedScale,
			position: geometry.position,
			baseWidth: baseWidth * baseScale,
			baseHeight: baseHeight * baseScale,
			rotation: proposedParams.rotation,
			canvasSize: localCanvasSize,
			snapThreshold,
			preferredEdges,
		});

		return {
			params: {
				...proposedParams,
				scale: Math.max(MIN_MASK_DIMENSION, startParams.scale * snappedScale),
			},
			activeLines: toGlobalMaskSnapLines({
				lines: activeLines,
				bounds,
				canvasSize,
			}),
		};
	}

	if (CORNER_SIZE_HANDLES.has(handleId)) {
		const proposedScale = getClampedRatio({
			next: proposedParams.width,
			base: startParams.width,
		});
		const { snappedScale, activeLines } = snapScale({
			proposedScale,
			position: geometry.position,
			baseWidth,
			baseHeight,
			rotation: proposedParams.rotation,
			canvasSize: localCanvasSize,
			snapThreshold,
			preferredEdges,
		});

		return {
			params: {
				...proposedParams,
				width: Math.max(MIN_MASK_DIMENSION, startParams.width * snappedScale),
				height: Math.max(MIN_MASK_DIMENSION, startParams.height * snappedScale),
			},
			activeLines: toGlobalMaskSnapLines({
				lines: activeLines,
				bounds,
				canvasSize,
			}),
		};
	}

	return { params: proposedParams, activeLines: [] };
}

export function snapMaskInteraction<TParams extends SharedMaskParams>({
	handleId,
	startParams,
	proposedParams,
	bounds,
	canvasSize,
	snapThreshold,
}: {
	handleId: string;
	startParams: TParams;
	proposedParams: TParams;
	bounds: ElementBounds;
	canvasSize: { width: number; height: number };
	snapThreshold: { x: number; y: number };
}): MaskSnapResult<TParams> {
	if (handleId === "position") {
		return snapMaskPosition({
			proposedParams,
			bounds,
			canvasSize,
			snapThreshold,
		}) as MaskSnapResult<TParams>;
	}

	if (handleId === "rotation") {
		return snapMaskRotation({ proposedParams }) as MaskSnapResult<TParams>;
	}

	return snapBoxMaskSize({
		handleId,
		startParams,
		proposedParams,
		bounds,
		canvasSize,
		snapThreshold,
	}) as MaskSnapResult<TParams>;
}

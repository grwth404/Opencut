import { generateUUID } from "@/utils/id";
import type { ParamDefinition } from "@/lib/params";
import { PEN_CURSOR } from "@/components/editor/panels/preview/cursors";
import type { ElementBounds } from "@/lib/preview/element-bounds";
import type {
	CustomMask,
	CustomMaskParams,
	MaskDefinition,
	MaskHandlePosition,
	MaskOverlay,
	MaskParamUpdateArgs,
} from "@/lib/masks/types";
import {
	buildCustomMaskPath2D,
	buildCustomMaskSvgPath,
	customMaskCanvasPointToLocal,
	findClosestPointOnCustomMaskSegment,
	getCustomMaskCanvasSegments,
	getCustomMaskCanvasGeometry,
	getCustomMaskLocalBounds,
	getCustomMaskSegmentCount,
	insertPointIntoCustomMaskSegment,
	parseCustomMaskHandleId,
	recenterCustomMaskPath,
	type CustomMaskPathPoint,
} from "@/lib/masks/custom-path";
import { getBoxMaskHandlePositions } from "@/lib/masks/handle-positions";
import { computeFeatherUpdate } from "@/lib/masks/param-update";
import {
	setMaskLocalCenter,
	toGlobalMaskSnapLines,
} from "@/lib/masks/geometry";
import {
	snapPosition,
	snapRotation,
	snapScale,
} from "@/lib/preview/preview-snap";

const PERCENTAGE_DISPLAY = {
	displayMultiplier: 100,
	step: 1,
} as const;

const CUSTOM_MASK_PARAMS: ParamDefinition<keyof CustomMaskParams & string>[] = [
	{
		key: "centerX",
		label: "X",
		type: "number",
		default: 0,
		min: -100,
		max: 100,
		...PERCENTAGE_DISPLAY,
	},
	{
		key: "centerY",
		label: "Y",
		type: "number",
		default: 0,
		min: -100,
		max: 100,
		...PERCENTAGE_DISPLAY,
	},
	{
		key: "rotation",
		label: "Rotation",
		type: "number",
		default: 0,
		min: 0,
		max: 360,
		step: 1,
	},
	{
		key: "scale",
		label: "Scale",
		type: "number",
		default: 1,
		min: 1,
		max: 500,
		...PERCENTAGE_DISPLAY,
	},
];

function getCustomMaskDisplayHandles({
	params,
	displayScale,
	bounds,
}: {
	params: CustomMaskParams;
	displayScale: number;
	bounds: ElementBounds;
}): {
	handles: MaskHandlePosition[];
	overlays: MaskOverlay[];
} {
	const points = params.path;
	const geometry = getCustomMaskCanvasGeometry({
		points,
		centerX: params.centerX,
		centerY: params.centerY,
		rotation: params.rotation,
		scale: params.scale,
		bounds,
	});

	const handles: MaskHandlePosition[] = [];
	const overlays: MaskOverlay[] = [];

	if (points.length > 0) {
		overlays.push({
			id: "path",
			type: "canvas-path",
			pathData: buildCustomMaskSvgPath({
				points,
				centerX: params.centerX,
				centerY: params.centerY,
				rotation: params.rotation,
				scale: params.scale,
				bounds,
				closed: params.closed,
			}),
			coordinateSpace: "canvas",
		});
	}

	if (params.closed) {
		const segmentStrokeWidth = 12;
		overlays.push(
			...getCustomMaskCanvasSegments({
				points,
				centerX: params.centerX,
				centerY: params.centerY,
				rotation: params.rotation,
				scale: params.scale,
				bounds,
				closed: true,
			}).map((segment) => ({
				id: `segment:${segment.index}`,
				type: "canvas-path" as const,
				pathData: segment.pathData,
				coordinateSpace: "canvas" as const,
				handleId: `segment:${segment.index}`,
				cursor: PEN_CURSOR,
				strokeOpacity: 0,
				strokeWidth: segmentStrokeWidth,
			})),
		);
	}

	const localBounds = getCustomMaskLocalBounds({ points, bounds });
	if (params.closed && localBounds) {
		handles.push(
			...getBoxMaskHandlePositions({
				centerX: params.centerX,
				centerY: params.centerY,
				width: (localBounds.width * params.scale) / bounds.width,
				height: (localBounds.height * params.scale) / bounds.height,
				rotation: params.rotation,
				feather: params.feather,
				sizeMode: "uniform",
				showScaleHandle: false,
				bounds,
				displayScale,
			}),
		);
	}

	geometry.anchors.forEach((point) => {
		handles.push({
			id: `point:${point.id}:anchor`,
			x: point.anchor.x,
			y: point.anchor.y,
			cursor: params.closed ? "move" : "pointer",
			kind: "point",
		});
	});

	return {
		handles,
		overlays,
	};
}

function updateCustomMaskPoint({
	points,
	pointId,
	updater,
}: {
	points: CustomMaskPathPoint[];
	pointId: string;
	updater: (point: CustomMaskPathPoint) => CustomMaskPathPoint;
}) {
	return points.map((point) => (point.id === pointId ? updater(point) : point));
}

function computeCustomMaskParamUpdate({
	handleId,
	startParams,
	deltaX,
	deltaY,
	startCanvasX,
	startCanvasY,
	bounds,
}: MaskParamUpdateArgs<CustomMaskParams>): Partial<CustomMaskParams> {
	if (handleId === "position") {
		return {
			centerX: startParams.centerX + deltaX / bounds.width,
			centerY: startParams.centerY + deltaY / bounds.height,
		};
	}

	const pivotX = bounds.cx + startParams.centerX * bounds.width;
	const pivotY = bounds.cy + startParams.centerY * bounds.height;

	if (handleId === "rotation") {
		const startAngle =
			(Math.atan2(startCanvasY - pivotY, startCanvasX - pivotX) * 180) /
			Math.PI;
		const currentAngle =
			(Math.atan2(
				startCanvasY + deltaY - pivotY,
				startCanvasX + deltaX - pivotX,
			) *
				180) /
			Math.PI;

		let deltaAngle = currentAngle - startAngle;
		if (deltaAngle > 180) deltaAngle -= 360;
		if (deltaAngle < -180) deltaAngle += 360;

		return {
			rotation: (((startParams.rotation + deltaAngle) % 360) + 360) % 360,
		};
	}

	if (handleId === "feather") {
		const angleRad = (startParams.rotation * Math.PI) / 180;
		return computeFeatherUpdate({
			startFeather: startParams.feather,
			deltaX,
			deltaY,
			directionX: -Math.sin(angleRad),
			directionY: Math.cos(angleRad),
		});
	}

	if (handleId === "scale") {
		const startDistance = Math.hypot(
			startCanvasX - pivotX,
			startCanvasY - pivotY,
		);
		const currentDistance = Math.hypot(
			startCanvasX + deltaX - pivotX,
			startCanvasY + deltaY - pivotY,
		);
		const scaleFactor = startDistance > 0 ? currentDistance / startDistance : 1;
		return {
			scale: Math.max(0.01, startParams.scale * scaleFactor),
		};
	}

	const parsedHandle = parseCustomMaskHandleId({ handleId });
	if (!parsedHandle) {
		return {};
	}

	const points = startParams.path;
	const currentPoint = {
		x: startCanvasX + deltaX,
		y: startCanvasY + deltaY,
	};
	const localPoint = customMaskCanvasPointToLocal({
		point: currentPoint,
		centerX: startParams.centerX,
		centerY: startParams.centerY,
		rotation: startParams.rotation,
		scale: startParams.scale,
		bounds,
	});

	return {
		path: updateCustomMaskPoint({
			points,
			pointId: parsedHandle.pointId,
			updater: (point) => {
				if (parsedHandle.part === "anchor") {
					return {
						...point,
						x: localPoint.x,
						y: localPoint.y,
					};
				}

				if (parsedHandle.part === "in") {
					return {
						...point,
						inX: localPoint.x - point.x,
						inY: localPoint.y - point.y,
					};
				}

				return {
					...point,
					outX: localPoint.x - point.x,
					outY: localPoint.y - point.y,
				};
			},
		}),
	};
}

export const customMaskDefinition: MaskDefinition<CustomMaskParams> = {
	type: "custom",
	name: "Custom",
	features: {
		hasPosition: true,
		hasRotation: true,
		sizeMode: "uniform",
	},
	params: CUSTOM_MASK_PARAMS,
	interaction: {
		getInteraction({
			params,
			bounds,
			displayScale,
			scaleX: _scaleX,
			scaleY: _scaleY,
		}) {
			return getCustomMaskDisplayHandles({ params, bounds, displayScale });
		},
		snap({
			handleId,
			proposedParams,
			startParams,
			bounds,
			canvasSize,
			snapThreshold,
		}) {
			const points = startParams.path;
			const localBounds = getCustomMaskLocalBounds({ points, bounds });
			if (!startParams.closed || !localBounds) {
				return {
					params: proposedParams,
					activeLines: [],
				};
			}

			const position = {
				x: proposedParams.centerX * bounds.width,
				y: proposedParams.centerY * bounds.height,
			};

			if (handleId === "position") {
				const { snappedPosition, activeLines } = snapPosition({
					proposedPosition: position,
					canvasSize: bounds,
					elementSize: {
						width: localBounds.width * proposedParams.scale,
						height: localBounds.height * proposedParams.scale,
					},
					rotation: proposedParams.rotation,
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

			if (handleId === "rotation") {
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

			if (handleId === "scale") {
				const { snappedScale, activeLines } = snapScale({
					proposedScale: proposedParams.scale,
					position,
					baseWidth: localBounds.width,
					baseHeight: localBounds.height,
					rotation: proposedParams.rotation,
					canvasSize: bounds,
					snapThreshold,
					preferredEdges: {
						right: true,
						bottom: true,
					},
				});

				return {
					params: {
						...proposedParams,
						scale: Math.max(0.01, snappedScale),
					},
					activeLines: toGlobalMaskSnapLines({
						lines: activeLines,
						bounds,
						canvasSize,
					}),
				};
			}

			return {
				params: proposedParams,
				activeLines: [],
			};
		},
	},
	buildDefault(): Omit<CustomMask, "id"> {
		return {
			type: "custom",
			params: {
				feather: 0,
				inverted: false,
				strokeColor: "#ffffff",
				strokeWidth: 0,
				strokeAlign: "center",
				path: [],
				closed: false,
				centerX: 0,
				centerY: 0,
				rotation: 0,
				scale: 1,
			},
		};
	},
	computeParamUpdate: computeCustomMaskParamUpdate,
	isActive(params) {
		return params.closed;
	},
	renderer: {
		buildPath({ resolvedParams, width, height }) {
			const params = resolvedParams as CustomMaskParams;
			const points = params.path;
			if (!params.closed) {
				return new Path2D();
			}

			return buildCustomMaskPath2D({
				points,
				centerX: params.centerX,
				centerY: params.centerY,
				rotation: params.rotation,
				scale: params.scale,
				bounds: {
					cx: width / 2,
					cy: height / 2,
					width,
					height,
					rotation: 0,
				},
				closed: true,
			});
		},
		renderStroke({ resolvedParams, ctx, width, height }) {
			const params = resolvedParams as CustomMaskParams;
			if (!params.closed) {
				return;
			}

			const points = params.path;
			const path = buildCustomMaskPath2D({
				points,
				centerX: params.centerX,
				centerY: params.centerY,
				rotation: params.rotation,
				scale: params.scale,
				bounds: {
					cx: width / 2,
					cy: height / 2,
					width,
					height,
					rotation: 0,
				},
				closed: true,
			});

			ctx.save();
			ctx.strokeStyle = params.strokeColor;
			ctx.lineWidth = params.strokeWidth;
			ctx.lineJoin = "round";
			ctx.lineCap = "round";
			ctx.stroke(path);

			if (params.strokeAlign === "inside") {
				ctx.globalCompositeOperation = "destination-in";
				ctx.fillStyle = "#ffffff";
				ctx.fill(path);
			}

			if (params.strokeAlign === "outside") {
				ctx.globalCompositeOperation = "destination-out";
				ctx.fillStyle = "#ffffff";
				ctx.fill(path);
			}
			ctx.restore();
		},
	},
};

export function appendPointToCustomMask({
	params,
	canvasPoint,
	bounds,
}: {
	params: CustomMaskParams;
	canvasPoint: { x: number; y: number };
	bounds: ElementBounds;
}): CustomMaskParams {
	const points = params.path;

	if (points.length === 0) {
		return {
			...params,
			centerX:
				bounds.width === 0 ? 0 : (canvasPoint.x - bounds.cx) / bounds.width,
			centerY:
				bounds.height === 0 ? 0 : (canvasPoint.y - bounds.cy) / bounds.height,
			rotation: 0,
			scale: 1,
			path: [
				{
					id: generateUUID(),
					x: 0,
					y: 0,
					inX: 0,
					inY: 0,
					outX: 0,
					outY: 0,
				},
			],
		};
	}

	const localPoint = customMaskCanvasPointToLocal({
		point: canvasPoint,
		centerX: params.centerX,
		centerY: params.centerY,
		rotation: params.rotation,
		scale: params.scale,
		bounds,
	});
	const nextPoints = [
		...points,
		{
			id: generateUUID(),
			x: localPoint.x,
			y: localPoint.y,
			inX: 0,
			inY: 0,
			outX: 0,
			outY: 0,
		},
	];
	const recentered = recenterCustomMaskPath({
		points: nextPoints,
		centerX: params.centerX,
		centerY: params.centerY,
		rotation: params.rotation,
		scale: params.scale,
		bounds,
	});

	return {
		...params,
		centerX: recentered.centerX,
		centerY: recentered.centerY,
		path: recentered.points,
	};
}

export function insertPointOnCustomMaskSegment({
	params,
	segmentIndex,
	canvasPoint,
	bounds,
	pointId = generateUUID(),
}: {
	params: CustomMaskParams;
	segmentIndex: number;
	canvasPoint: { x: number; y: number };
	bounds: ElementBounds;
	pointId?: string;
}): { params: CustomMaskParams; pointId: string } | null {
	const points = params.path;
	if (getCustomMaskSegmentCount({ points, closed: params.closed }) === 0) {
		return null;
	}

	const closestPoint = findClosestPointOnCustomMaskSegment({
		points,
		segmentIndex,
		canvasPoint,
		centerX: params.centerX,
		centerY: params.centerY,
		rotation: params.rotation,
		scale: params.scale,
		bounds,
		closed: params.closed,
	});
	if (!closestPoint) {
		return null;
	}

	const nextPoints = insertPointIntoCustomMaskSegment({
		points,
		segmentIndex,
		pointId,
		t: closestPoint.t,
		closed: params.closed,
	});
	if (nextPoints.length === points.length) {
		return null;
	}

	const recentered = recenterCustomMaskPath({
		points: nextPoints,
		centerX: params.centerX,
		centerY: params.centerY,
		rotation: params.rotation,
		scale: params.scale,
		bounds,
	});

	return {
		pointId,
		params: {
			...params,
			centerX: recentered.centerX,
			centerY: recentered.centerY,
			path: recentered.points,
		},
	};
}

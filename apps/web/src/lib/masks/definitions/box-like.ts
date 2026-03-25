import {
	DEFAULT_SHAPE_MASK_SHORT_SIDE_RATIO,
	MIN_MASK_DIMENSION,
} from "@/constants/mask-constants";
import { computeFeatherUpdate } from "../param-update";
import type {
	BaseMaskParams,
	MaskDefaultContext,
	MaskParamUpdateArgs,
	RectangleMaskParams,
} from "@/lib/masks/types";
import type {
	NumberParamDefinition,
	ParamDefinition,
	ParamValues,
} from "@/lib/params";

const PERCENTAGE_DISPLAY: Pick<
	NumberParamDefinition,
	"displayMultiplier" | "step"
> = {
	displayMultiplier: 100,
	step: 1,
};

export const BOX_LIKE_MASK_PARAMS: ParamDefinition<
	keyof RectangleMaskParams & string
>[] = [
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
		key: "width",
		label: "Width",
		type: "number",
		default: 0.6,
		min: 1,
		...PERCENTAGE_DISPLAY,
	},
	{
		key: "height",
		label: "Height",
		type: "number",
		default: 0.6,
		min: 1,
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
	{
		key: "strokeAlign",
		label: "Stroke Align",
		type: "select",
		default: "center",
		options: [
			{ value: "inside", label: "Inside" },
			{ value: "center", label: "Center" },
			{ value: "outside", label: "Outside" },
		],
	},
];

export function getDefaultBaseMaskParams(): BaseMaskParams {
	return {
		feather: 0,
		inverted: false,
		strokeColor: "#ffffff",
		strokeWidth: 0,
		strokeAlign: "center",
	};
}

export function getStrokeOffset({
	strokeAlign,
	strokeWidth,
}: Pick<BaseMaskParams, "strokeAlign" | "strokeWidth">): number {
	if (strokeAlign === "inside") {
		return -(strokeWidth / 2);
	}

	if (strokeAlign === "outside") {
		return strokeWidth / 2;
	}

	return 0;
}

export function getDefaultSquareMaskParams({
	elementSize,
}: MaskDefaultContext): RectangleMaskParams {
	const absWidth = Math.abs(elementSize?.width ?? 0);
	const absHeight = Math.abs(elementSize?.height ?? 0);
	const shortSide = Math.min(absWidth, absHeight);
	const squareSide =
		shortSide > 0 ? shortSide * DEFAULT_SHAPE_MASK_SHORT_SIDE_RATIO : 0;
	const width =
		absWidth > 0 ? squareSide / absWidth : DEFAULT_SHAPE_MASK_SHORT_SIDE_RATIO;
	const height =
		absHeight > 0
			? squareSide / absHeight
			: DEFAULT_SHAPE_MASK_SHORT_SIDE_RATIO;

	return {
		...getDefaultBaseMaskParams(),
		centerX: 0,
		centerY: 0,
		width,
		height,
		rotation: 0,
		scale: 1,
	};
}

export function getBoxLikeGeometry({
	params,
	width,
	height,
}: {
	params: RectangleMaskParams;
	width: number;
	height: number;
}) {
	return {
		centerX: width / 2 + params.centerX * width,
		centerY: height / 2 + params.centerY * height,
		maskWidth: Math.max(params.width, MIN_MASK_DIMENSION) * width,
		maskHeight: Math.max(params.height, MIN_MASK_DIMENSION) * height,
		rotationRad: (params.rotation * Math.PI) / 180,
	};
}

export function computeBoxMaskParamUpdate({
	handleId,
	startParams,
	deltaX,
	deltaY,
	bounds,
}: MaskParamUpdateArgs<RectangleMaskParams>): ParamValues {
	if (handleId === "position") {
		return {
			centerX: startParams.centerX + deltaX / bounds.width,
			centerY: startParams.centerY + deltaY / bounds.height,
		};
	}

	if (handleId === "rotation") {
		const currentAngle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
		const newRotation = (startParams.rotation + currentAngle) % 360;
		return { rotation: newRotation < 0 ? newRotation + 360 : newRotation };
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

	const halfWidth = startParams.width * bounds.width;
	const halfHeight = startParams.height * bounds.height;

	if (handleId === "right" || handleId === "left") {
		const sign = handleId === "right" ? 1 : -1;
		return {
			width: Math.max(
				MIN_MASK_DIMENSION,
				startParams.width + (sign * deltaX * 2) / bounds.width,
			),
		};
	}

	if (handleId === "bottom" || handleId === "top") {
		const sign = handleId === "bottom" ? 1 : -1;
		return {
			height: Math.max(
				MIN_MASK_DIMENSION,
				startParams.height + (sign * deltaY * 2) / bounds.height,
			),
		};
	}

	if (
		handleId === "top-left" ||
		handleId === "top-right" ||
		handleId === "bottom-left" ||
		handleId === "bottom-right"
	) {
		const signX = handleId.includes("right") ? 1 : -1;
		const signY = handleId.includes("bottom") ? 1 : -1;
		const distance = Math.sqrt(
			(signX * deltaX + halfWidth) ** 2 + (signY * deltaY + halfHeight) ** 2,
		);
		const originalDistance = Math.sqrt(halfWidth ** 2 + halfHeight ** 2);
		const scale = originalDistance > 0 ? distance / originalDistance : 1;
		return {
			width: Math.max(MIN_MASK_DIMENSION, startParams.width * scale),
			height: Math.max(MIN_MASK_DIMENSION, startParams.height * scale),
		};
	}

	if (handleId === "scale") {
		const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
		const originalDistance = Math.sqrt(halfWidth ** 2 + halfHeight ** 2);
		const scale = originalDistance > 0 ? 1 + distance / originalDistance : 1;
		return {
			scale: Math.max(MIN_MASK_DIMENSION, startParams.scale * scale),
		};
	}

	return {};
}

export function rotatePoint({
	x,
	y,
	centerX,
	centerY,
	rotationRad,
}: {
	x: number;
	y: number;
	centerX: number;
	centerY: number;
	rotationRad: number;
}) {
	const dx = x - centerX;
	const dy = y - centerY;
	const cos = Math.cos(rotationRad);
	const sin = Math.sin(rotationRad);

	return {
		x: centerX + dx * cos - dy * sin,
		y: centerY + dx * sin + dy * cos,
	};
}

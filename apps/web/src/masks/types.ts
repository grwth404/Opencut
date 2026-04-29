import type { ElementBounds } from "@/preview/element-bounds";
import type { SnapLine } from "@/preview/preview-snap";
import type { ParamDefinition } from "@/params";
import type { CustomMaskPathPoint } from "@/masks/custom-path";
import type {
	TextDecoration,
	TextFontStyle,
	TextFontWeight,
} from "@/text/primitives";

export type MaskType =
	| "split"
	| "cinematic-bars"
	| "rectangle"
	| "ellipse"
	| "heart"
	| "diamond"
	| "star"
	| "text"
	| "custom";

export interface BaseMaskParams {
	feather: number;
	inverted: boolean;
	strokeColor: string;
	strokeWidth: number;
	strokeAlign: "inside" | "center" | "outside";
}

export interface SplitMaskParams extends BaseMaskParams {
	centerX: number;
	centerY: number;
	rotation: number;
}

export interface RectangleMaskParams extends BaseMaskParams {
	centerX: number;
	centerY: number;
	width: number;
	height: number;
	rotation: number;
	scale: number;
}

export interface TextMaskParams extends BaseMaskParams {
	content: string;
	fontSize: number;
	fontFamily: string;
	fontWeight: TextFontWeight;
	fontStyle: TextFontStyle;
	textDecoration: TextDecoration;
	letterSpacing: number;
	lineHeight: number;
	centerX: number;
	centerY: number;
	rotation: number;
	scale: number;
}

export interface CustomMaskParams extends BaseMaskParams {
	path: CustomMaskPathPoint[];
	closed: boolean;
	centerX: number;
	centerY: number;
	rotation: number;
	scale: number;
}

export interface SplitMask {
	id: string;
	type: "split";
	params: SplitMaskParams;
}

export interface CinematicBarsMask {
	id: string;
	type: "cinematic-bars";
	params: RectangleMaskParams;
}

export interface RectangleMask {
	id: string;
	type: "rectangle";
	params: RectangleMaskParams;
}

export interface EllipseMask {
	id: string;
	type: "ellipse";
	params: RectangleMaskParams;
}

export interface HeartMask {
	id: string;
	type: "heart";
	params: RectangleMaskParams;
}

export interface DiamondMask {
	id: string;
	type: "diamond";
	params: RectangleMaskParams;
}

export interface StarMask {
	id: string;
	type: "star";
	params: RectangleMaskParams;
}

export interface TextMask {
	id: string;
	type: "text";
	params: TextMaskParams;
}

export interface CustomMask {
	id: string;
	type: "custom";
	params: CustomMaskParams;
}

export type Mask =
	| SplitMask
	| CinematicBarsMask
	| RectangleMask
	| EllipseMask
	| HeartMask
	| DiamondMask
	| StarMask
	| TextMask
	| CustomMask;

export type MaskByType<TType extends MaskType> = Extract<Mask, { type: TType }>;
export type MaskParamsByType<TType extends MaskType> =
	MaskByType<TType>["params"];

type MaskPathArgs<TParams extends BaseMaskParams> = {
	resolvedParams: TParams;
	width: number;
	height: number;
};

type MaskDrawArgs<TParams extends BaseMaskParams> = MaskPathArgs<TParams> & {
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
};

export type MaskBody<TParams extends BaseMaskParams = BaseMaskParams> =
	| {
			kind: "fillPath";
			buildPath(args: MaskPathArgs<TParams>): Path2D;
	  }
	| {
			kind: "drawOpaque";
			drawOpaque(args: MaskDrawArgs<TParams>): void;
	  }
	| {
			kind: "drawWithFeather";
			drawWithFeather(args: MaskDrawArgs<TParams> & { feather: number }): void;
			opaqueFastPath?: {
				buildPath(args: MaskPathArgs<TParams>): Path2D;
			};
	  };

export type MaskStroke<TParams extends BaseMaskParams = BaseMaskParams> =
	| {
			kind: "strokeFromPath";
			buildStrokePath(args: MaskPathArgs<TParams>): Path2D;
	  }
	| {
			kind: "renderStroke";
			renderStroke(args: MaskDrawArgs<TParams>): void;
	  };

export interface MaskRenderer<TParams extends BaseMaskParams = BaseMaskParams> {
	body: MaskBody<TParams>;
	stroke?: MaskStroke<TParams>;
}

export interface MaskFeatures {
	hasPosition: boolean;
	hasRotation: boolean;
	sizeMode: "none" | "uniform" | "width-height" | "height-only" | "width-only";
}

export type MaskHandleIcon = "rotate" | "feather";

export type MaskHandleKind = "corner" | "edge" | "icon" | "point" | "tangent";

export interface MaskHandlePosition {
	id: string;
	x: number;
	y: number;
	cursor: string;
	kind: MaskHandleKind;
	isSelected?: boolean;
	edgeAxis?: "horizontal" | "vertical";
	rotation?: number;
	icon?: MaskHandleIcon;
}

export interface MaskLineOverlay {
	id: string;
	type: "line";
	start: { x: number; y: number };
	end: { x: number; y: number };
	cursor?: string;
	handleId?: string;
}

export interface MaskRectOverlay {
	id: string;
	type: "rect";
	center: { x: number; y: number };
	width: number;
	height: number;
	rotation: number;
	dashed?: boolean;
	cursor?: string;
	handleId?: string;
}

export interface MaskShapeOverlay {
	id: string;
	type: "shape";
	center: { x: number; y: number };
	width: number;
	height: number;
	rotation: number;
	pathData: string;
	cursor?: string;
	handleId?: string;
}

export interface MaskCanvasPathOverlay {
	id: string;
	type: "canvas-path";
	pathData: string;
	coordinateSpace?: "canvas" | "overlay";
	cursor?: string;
	handleId?: string;
	strokeWidth?: number;
	strokeOpacity?: number;
}

export type MaskOverlay =
	| MaskLineOverlay
	| MaskRectOverlay
	| MaskShapeOverlay
	| MaskCanvasPathOverlay;

export interface MaskDefaultContext {
	elementSize?: { width: number; height: number };
}

export interface MaskParamUpdateArgs<
	TParams extends BaseMaskParams = BaseMaskParams,
> {
	handleId: string;
	startParams: TParams;
	deltaX: number;
	deltaY: number;
	startCanvasX: number;
	startCanvasY: number;
	bounds: ElementBounds;
	canvasSize: { width: number; height: number };
}

export interface MaskSnapArgs<TParams extends BaseMaskParams = BaseMaskParams> {
	handleId: string;
	startParams: TParams;
	proposedParams: TParams;
	bounds: ElementBounds;
	canvasSize: { width: number; height: number };
	snapThreshold: { x: number; y: number };
}

export interface MaskSnapResult<
	TParams extends BaseMaskParams = BaseMaskParams,
> {
	params: TParams;
	activeLines: SnapLine[];
}

export interface MaskInteractionResult {
	handles: MaskHandlePosition[];
	overlays: MaskOverlay[];
}

export interface MaskInteractionDefinition<
	TParams extends BaseMaskParams = BaseMaskParams,
> {
	getInteraction(args: {
		params: TParams;
		bounds: ElementBounds;
		displayScale: number;
		scaleX: number;
		scaleY: number;
	}): MaskInteractionResult;
	snap?(args: MaskSnapArgs<TParams>): MaskSnapResult<TParams>;
}

export interface MaskDefinition<TType extends MaskType = MaskType> {
	type: TType;
	name: string;
	features: MaskFeatures;
	params: ParamDefinition<keyof MaskParamsByType<TType> & string>[];
	renderer: MaskRenderer<MaskParamsByType<TType>>;
	interaction: MaskInteractionDefinition<MaskParamsByType<TType>>;
	/** When defined and returning false, the mask is not applied and the element renders fully visible. */
	isActive?(params: MaskParamsByType<TType>): boolean;
	buildDefault(context: MaskDefaultContext): Omit<MaskByType<TType>, "id">;
	computeParamUpdate(
		args: MaskParamUpdateArgs<MaskParamsByType<TType>>,
	): Partial<MaskParamsByType<TType>>;
}

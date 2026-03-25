import type { ElementBounds } from "@/lib/preview/element-bounds";
import type { ParamDefinition, ParamValues } from "@/lib/params";

export type MaskType = "split" | "rectangle" | "ellipse";

export interface BaseMaskParams extends ParamValues {
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

export interface SplitMask {
	id: string;
	type: "split";
	params: SplitMaskParams;
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

export type Mask = SplitMask | RectangleMask | EllipseMask;

export interface MaskRenderer {
	buildPath(params: {
		resolvedParams: unknown;
		width: number;
		height: number;
	}): Path2D;
	buildStrokePath?: (params: {
		resolvedParams: unknown;
		width: number;
		height: number;
	}) => Path2D;
	/** Renders the feathered mask directly onto ctx, bypassing JFA. */
	renderMask?: (params: {
		resolvedParams: unknown;
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
		feather: number;
	}) => void;
}

export type MaskOverlayShape = "line" | "box";

export interface MaskFeatures {
	hasPosition: boolean;
	hasRotation: boolean;
	sizeMode: "none" | "uniform" | "width-height" | "height-only" | "width-only";
}

export interface MaskHandlePosition {
	id: string;
	x: number;
	y: number;
	cursor: string;
}

export interface MaskLinePoints {
	start: { x: number; y: number };
	end: { x: number; y: number };
}

export interface MaskDefaultContext {
	elementSize?: { width: number; height: number };
}

export interface MaskParamUpdateArgs<TParams extends BaseMaskParams = BaseMaskParams> {
	handleId: string;
	startParams: TParams;
	deltaX: number;
	deltaY: number;
	startCanvasX: number;
	startCanvasY: number;
	bounds: ElementBounds;
	canvasSize: { width: number; height: number };
}

export interface MaskDefinition<TParams extends BaseMaskParams = BaseMaskParams> {
	type: MaskType;
	name: string;
	overlayShape: MaskOverlayShape;
	features: MaskFeatures;
	params: ParamDefinition<keyof TParams & string>[];
	renderer: MaskRenderer;
	buildOverlayPath?: (params: { width: number; height: number }) => string;
	buildDefault(context: MaskDefaultContext): Omit<Mask, "id">;
	computeParamUpdate(args: MaskParamUpdateArgs<TParams>): ParamValues;
}

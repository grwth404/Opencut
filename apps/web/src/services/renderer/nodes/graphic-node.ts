import { createOffscreenCanvas } from "../canvas-utils";
import {
	DEFAULT_GRAPHIC_SOURCE_SIZE,
	getGraphicDefinition,
	registerDefaultGraphics,
} from "@/graphics";
import type { ParamValues } from "@/params";
import {
	VisualNode,
	type ResolvedVisualNodeState,
	type VisualNodeParams,
} from "./visual-node";

export interface GraphicNodeParams extends VisualNodeParams {
	definitionId: string;
	params: ParamValues;
}

export interface ResolvedGraphicNodeState extends ResolvedVisualNodeState {
	resolvedParams: ParamValues;
}

export class GraphicNode extends VisualNode<
	GraphicNodeParams,
	ResolvedGraphicNodeState
> {
	private cachedKey: string | null = null;
	private cachedSource: OffscreenCanvas | HTMLCanvasElement | null = null;

	constructor(params: GraphicNodeParams) {
		super(params);
		registerDefaultGraphics();
	}

	getSource({
		resolvedParams,
	}: {
		resolvedParams: ParamValues;
	}): OffscreenCanvas | HTMLCanvasElement | null {
		const definition = getGraphicDefinition({
			definitionId: this.params.definitionId,
		});
		const cacheKey = JSON.stringify({
			definitionId: this.params.definitionId,
			params: resolvedParams,
		});
		if (this.cachedSource && this.cachedKey === cacheKey) {
			return this.cachedSource;
		}

		const canvas = createOffscreenCanvas({
			width: DEFAULT_GRAPHIC_SOURCE_SIZE,
			height: DEFAULT_GRAPHIC_SOURCE_SIZE,
		});
		const ctx = canvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (!ctx) {
			return null;
		}

		definition.render({
			ctx,
			params: resolvedParams,
			width: DEFAULT_GRAPHIC_SOURCE_SIZE,
			height: DEFAULT_GRAPHIC_SOURCE_SIZE,
		});

		this.cachedKey = cacheKey;
		this.cachedSource = canvas;
		return canvas;
	}
}

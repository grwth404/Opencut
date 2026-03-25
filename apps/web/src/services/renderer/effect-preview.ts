import { createOffscreenCanvas } from "./canvas-utils";
import { effectsRegistry, resolveEffectPasses } from "@/lib/effects";
import { buildDefaultParamValues } from "@/lib/registry";
import type { ParamValues } from "@/lib/params";
import { applyMultiPassEffect } from "./webgl/webgl-utils";
import type { EffectPassData } from "./webgl/webgl-utils";

const PREVIEW_SIZE = 160;
const PREVIEW_IMAGE_PATH = "/effects/preview.jpg";

class EffectPreviewService {
	private previewGl: WebGLRenderingContext | null = null;
	private previewCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
	private testSourceCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
	private previewImageElement: HTMLImageElement | null = null;
	private programCache = new Map<string, WebGLProgram>();
	private onReadyCallbacks = new Set<() => void>();

	readonly PREVIEW_SIZE = PREVIEW_SIZE;

	constructor() {
		this.loadPreviewImage();
	}

	onPreviewImageReady({
		callback,
	}: {
		callback: () => void;
	}): () => void {
		this.onReadyCallbacks.add(callback);
		return () => this.onReadyCallbacks.delete(callback);
	}

	renderPreview({
		effectType,
		params,
		targetCanvas,
		uniformDimensions,
	}: {
		effectType: string;
		params: ParamValues;
		targetCanvas: HTMLCanvasElement;
		uniformDimensions?: { width: number; height: number };
	}): void {
		const size = PREVIEW_SIZE;
		const source = this.getTestSource({ width: size, height: size });
		if (!source) return;

		const definition = effectsRegistry.get(effectType);
		const resolvedParams =
			Object.keys(params).length > 0
				? params
				: buildDefaultParamValues(definition.params);

		const passes = resolveEffectPasses({
			definition,
			effectParams: resolvedParams,
			width: uniformDimensions?.width ?? size,
			height: uniformDimensions?.height ?? size,
		});
		const result = this.applyWebGlEffect({
			source,
			width: size,
			height: size,
			passes,
		});

		const targetCtx = targetCanvas.getContext(
			"2d",
		) as CanvasRenderingContext2D | null;
		if (targetCtx) {
			targetCanvas.width = size;
			targetCanvas.height = size;
			targetCtx.drawImage(result, 0, 0, size, size);
		}
	}

	private loadPreviewImage(): void {
		if (typeof window === "undefined") return;
		const image = new Image();
		image.onload = () => {
			this.testSourceCanvas = null;
			for (const callback of this.onReadyCallbacks) {
				callback();
			}
		};
		image.src = PREVIEW_IMAGE_PATH;
		this.previewImageElement = image;
	}

	private createTestSource({
		width,
		height,
	}: {
		width: number;
		height: number;
	}): OffscreenCanvas | HTMLCanvasElement | null {
		const isImageReady =
			this.previewImageElement?.complete &&
			(this.previewImageElement.naturalWidth ?? 0) > 0;
		if (!isImageReady || !this.previewImageElement) {
			return null;
		}

		const canvas = createOffscreenCanvas({ width, height });
		const ctx = canvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (!ctx) {
			throw new Error("failed to get 2d context for test source");
		}
		ctx.drawImage(this.previewImageElement, 0, 0, width, height);
		return canvas;
	}

	private getOrCreatePreviewContext({
		width,
		height,
	}: {
		width: number;
		height: number;
	}): { canvas: OffscreenCanvas | HTMLCanvasElement; gl: WebGLRenderingContext } {
		if (!this.previewCanvas || !this.previewGl) {
			this.previewCanvas = createOffscreenCanvas({ width, height });
			this.previewGl = this.previewCanvas.getContext("webgl", {
				premultipliedAlpha: false,
			}) as WebGLRenderingContext | null;
			if (!this.previewGl) {
				throw new Error("WebGL not supported");
			}
		}
		if (this.previewCanvas.width !== width || this.previewCanvas.height !== height) {
			this.previewCanvas.width = width;
			this.previewCanvas.height = height;
		}
		return { canvas: this.previewCanvas, gl: this.previewGl };
	}

	private getTestSource({
		width,
		height,
	}: {
		width: number;
		height: number;
	}): CanvasImageSource | null {
		if (
			!this.testSourceCanvas ||
			this.testSourceCanvas.width !== width ||
			this.testSourceCanvas.height !== height
		) {
			this.testSourceCanvas = this.createTestSource({ width, height });
		}
		return this.testSourceCanvas;
	}

	private applyWebGlEffect({
		source,
		width,
		height,
		passes,
	}: {
		source: CanvasImageSource;
		width: number;
		height: number;
		passes: EffectPassData[];
	}): OffscreenCanvas | HTMLCanvasElement {
		const { canvas: glCanvas, gl } = this.getOrCreatePreviewContext({ width, height });

		applyMultiPassEffect({
			context: gl,
			source,
			width,
			height,
			passes,
			programCache: this.programCache,
		});

		const outputCanvas = createOffscreenCanvas({ width, height });
		const outputCtx = outputCanvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (outputCtx) {
			outputCtx.drawImage(glCanvas, 0, 0, width, height);
		}
		return outputCanvas;
	}
}

export const effectPreviewService = new EffectPreviewService();

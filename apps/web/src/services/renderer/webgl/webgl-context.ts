import { createOffscreenCanvas } from "../canvas-utils";

let gl: WebGLRenderingContext | null = null;
let webglCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
const programCache = new Map<string, WebGLProgram>();

export function getWebGLContext({
	width,
	height,
}: {
	width: number;
	height: number;
}): {
	context: WebGLRenderingContext;
	programCache: Map<string, WebGLProgram>;
} {
	if (!webglCanvas) {
		webglCanvas = createOffscreenCanvas({ width, height });
		gl = webglCanvas.getContext("webgl", {
			premultipliedAlpha: false,
		}) as WebGLRenderingContext | null;
		if (!gl) throw new Error("WebGL not supported");
	}
	if (webglCanvas.width !== width || webglCanvas.height !== height) {
		webglCanvas.width = width;
		webglCanvas.height = height;
	}
	if (!gl) throw new Error("WebGL context lost");
	return { context: gl, programCache };
}

export function readResult({
	width,
	height,
}: {
	width: number;
	height: number;
}): OffscreenCanvas | HTMLCanvasElement {
	if (!webglCanvas) throw new Error("WebGL canvas not initialized");
	const outputCanvas = createOffscreenCanvas({ width, height });
	const outputCtx = outputCanvas.getContext("2d") as
		| CanvasRenderingContext2D
		| OffscreenCanvasRenderingContext2D
		| null;
	if (outputCtx) {
		outputCtx.drawImage(webglCanvas, 0, 0, width, height);
	}
	return outputCanvas;
}

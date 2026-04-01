import { gpuRenderer } from "./gpu-renderer";

export function applyMaskFeather({
	maskCanvas,
	width,
	height,
	feather,
}: {
	maskCanvas: CanvasImageSource;
	width: number;
	height: number;
	feather: number;
}): OffscreenCanvas | HTMLCanvasElement {
	return gpuRenderer.applyMaskFeather({
		maskCanvas,
		width,
		height,
		feather,
	}) as OffscreenCanvas | HTMLCanvasElement;
}

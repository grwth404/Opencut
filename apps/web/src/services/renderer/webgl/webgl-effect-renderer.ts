import { getWebGLContext, readResult } from "./webgl-context";
import { applyMultiPassEffect } from "./webgl-utils";
import type { EffectPassData } from "./webgl-utils";

export interface ApplyEffectParams {
	source: CanvasImageSource;
	width: number;
	height: number;
	passes: EffectPassData[];
}

function applyEffect({
	source,
	width,
	height,
	passes,
}: ApplyEffectParams): CanvasImageSource {
	if (passes.length === 0) {
		return source;
	}
	const { context, programCache } = getWebGLContext({ width, height });
	applyMultiPassEffect({
		context,
		source,
		width,
		height,
		passes,
		programCache,
	});
	return readResult({ width, height });
}

export const webglEffectRenderer = {
	applyEffect,
};

import jfaDistanceShader from "@/lib/masks/shaders/jfa-distance.frag.glsl";
import { getWebGLContext, readResult } from "./webgl/webgl-context";
import { computeSignedDistanceField, runPass } from "./webgl/jfa";
import { compileProgram, createTexture } from "./webgl/webgl-utils";

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
	const { context, programCache } = getWebGLContext({ width, height });
	const sourceTexture = createTexture({ context, source: maskCanvas });

	const sdf = computeSignedDistanceField({
		context,
		programCache,
		sourceTexture,
		width,
		height,
	});

	const distanceProgram = compileProgram({
		context,
		fragmentShaderSource: jfaDistanceShader,
		programCache,
	});

	runPass({
		context,
		program: distanceProgram,
		inputTexture: sdf.insideTexture,
		target: null,
		width,
		height,
		uniforms: { u_feather_half: feather / 2.0 },
		extraBindings: [
			{ unit: 1, texture: sdf.outsideTexture, name: "u_jfa_outside" },
		],
	});

	context.deleteTexture(sourceTexture);
	sdf.cleanup();

	context.bindTexture(context.TEXTURE_2D, null);
	context.bindFramebuffer(context.FRAMEBUFFER, null);

	return readResult({ width, height });
}

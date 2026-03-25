import jfaInitShader from "@/lib/shaders/jfa-init.frag.glsl";
import jfaStepShader from "@/lib/shaders/jfa-step.frag.glsl";
import {
	compileProgram,
	createFramebufferTexture,
	setUniforms,
	drawFullscreenQuad,
} from "./webgl-utils";

interface FBPair {
	texture: WebGLTexture;
	framebuffer: WebGLFramebuffer;
}

function runPass({
	context,
	program,
	inputTexture,
	target,
	width,
	height,
	uniforms,
	extraBindings,
}: {
	context: WebGLRenderingContext;
	program: WebGLProgram;
	inputTexture: WebGLTexture;
	target: WebGLFramebuffer | null;
	width: number;
	height: number;
	uniforms: Record<string, number | number[]>;
	extraBindings?: Array<{ unit: number; texture: WebGLTexture; name: string }>;
}): void {
	context.bindFramebuffer(context.FRAMEBUFFER, target);
	// biome-ignore lint/correctness/useHookAtTopLevel: WebGL API method, not a React hook
	context.useProgram(program);

	context.activeTexture(context.TEXTURE0);
	context.bindTexture(context.TEXTURE_2D, inputTexture);
	const uTexLoc = context.getUniformLocation(program, "u_texture");
	if (uTexLoc) context.uniform1i(uTexLoc, 0);

	if (extraBindings) {
		for (const binding of extraBindings) {
			context.activeTexture(context.TEXTURE0 + binding.unit);
			context.bindTexture(context.TEXTURE_2D, binding.texture);
			const loc = context.getUniformLocation(program, binding.name);
			if (loc) context.uniform1i(loc, binding.unit);
		}
	}

	setUniforms({
		context,
		program,
		uniforms: { ...uniforms, u_resolution: [width, height] },
	});
	drawFullscreenQuad({ context, program, width, height });
}

function runJFA({
	context,
	programCache,
	sourceTexture,
	width,
	height,
	isInverted,
}: {
	context: WebGLRenderingContext;
	programCache: Map<string, WebGLProgram>;
	sourceTexture: WebGLTexture;
	width: number;
	height: number;
	isInverted: boolean;
}): {
	resultTexture: WebGLTexture;
	resultFB: WebGLFramebuffer;
	tempFBs: FBPair[];
} {
	const numSteps = Math.ceil(Math.log2(Math.max(width, height)));

	const fbA = createFramebufferTexture({ context, width, height });
	const fbB = createFramebufferTexture({ context, width, height });

	const initProgram = compileProgram({
		context,
		fragmentShaderSource: jfaInitShader,
		programCache,
	});
	runPass({
		context,
		program: initProgram,
		inputTexture: sourceTexture,
		target: fbA.framebuffer,
		width,
		height,
		uniforms: { u_invert: isInverted ? 1.0 : 0.0 },
	});

	const stepProgram = compileProgram({
		context,
		fragmentShaderSource: jfaStepShader,
		programCache,
	});

	let readFB = fbA;
	let writeFB = fbB;

	for (let i = numSteps - 1; i >= 0; i--) {
		const stepSize = 2 ** i;
		runPass({
			context,
			program: stepProgram,
			inputTexture: readFB.texture,
			target: writeFB.framebuffer,
			width,
			height,
			uniforms: { u_step_size: stepSize },
		});
		const tmp = readFB;
		readFB = writeFB;
		writeFB = tmp;
	}

	return {
		resultTexture: readFB.texture,
		resultFB: readFB.framebuffer,
		tempFBs: [writeFB],
	};
}

function cleanupJFAResult({
	context,
	result,
}: {
	context: WebGLRenderingContext;
	result: {
		resultTexture: WebGLTexture;
		resultFB: WebGLFramebuffer;
		tempFBs: FBPair[];
	};
}): void {
	context.deleteTexture(result.resultTexture);
	context.deleteFramebuffer(result.resultFB);
	for (const fb of result.tempFBs) {
		context.deleteTexture(fb.texture);
		context.deleteFramebuffer(fb.framebuffer);
	}
}

export { runPass };

export function computeSignedDistanceField({
	context,
	programCache,
	sourceTexture,
	width,
	height,
}: {
	context: WebGLRenderingContext;
	programCache: Map<string, WebGLProgram>;
	sourceTexture: WebGLTexture;
	width: number;
	height: number;
}): {
	insideTexture: WebGLTexture;
	outsideTexture: WebGLTexture;
	cleanup: () => void;
} {
	const inside = runJFA({
		context,
		programCache,
		sourceTexture,
		width,
		height,
		isInverted: false,
	});
	const outside = runJFA({
		context,
		programCache,
		sourceTexture,
		width,
		height,
		isInverted: true,
	});

	return {
		insideTexture: inside.resultTexture,
		outsideTexture: outside.resultTexture,
		cleanup: () => {
			cleanupJFAResult({ context, result: inside });
			cleanupJFAResult({ context, result: outside });
		},
	};
}

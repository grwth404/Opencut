import type { EffectDefinition, ResolvedEffectPass } from "@/lib/effects/types";
import blurFragmentShader from "./blur.frag.glsl";

const MAX_SINGLE_PASS_SIGMA = 10;
const MAX_STEP = 4;
const MAX_EFFECTIVE_SIGMA = MAX_SINGLE_PASS_SIGMA * MAX_STEP;
const MAX_ITERATIONS = 8;

/**
 * Builds multi-pass gaussian blur passes for a given sigma.
 * Shared by the blur effect and background blur — they each
 * compute their own sigma from their own intensity scale.
 */
export function buildGaussianBlurPasses({
	sigmaX,
	sigmaY,
}: {
	sigmaX: number;
	sigmaY: number;
}): ResolvedEffectPass[] {
	const maxSigma = Math.max(sigmaX, sigmaY);
	if (maxSigma < 0.001) return [];

	const iterations = Math.min(
		MAX_ITERATIONS,
		Math.max(
			1,
			Math.ceil(
				(maxSigma * maxSigma) /
					(MAX_EFFECTIVE_SIGMA * MAX_EFFECTIVE_SIGMA),
			),
		),
	);
	const perPassSigmaX = sigmaX / Math.sqrt(iterations);
	const perPassSigmaY = sigmaY / Math.sqrt(iterations);
	const stepX = Math.max(1, perPassSigmaX / MAX_SINGLE_PASS_SIGMA);
	const stepY = Math.max(1, perPassSigmaY / MAX_SINGLE_PASS_SIGMA);

	const passes: ResolvedEffectPass[] = [];
	for (let i = 0; i < iterations; i++) {
		passes.push({
			fragmentShader: blurFragmentShader,
			uniforms: {
				u_sigma: perPassSigmaX,
				u_step: stepX,
				u_direction: [1, 0],
			},
		});
		passes.push({
			fragmentShader: blurFragmentShader,
			uniforms: {
				u_sigma: perPassSigmaY,
				u_step: stepY,
				u_direction: [0, 1],
			},
		});
	}
	return passes;
}

function intensityToSigma(intensity: number, resolution: number, reference: number): number {
	return (intensity / 5) * (resolution / reference);
}

function parseIntensity(effectParams: Record<string, unknown>): number {
	const raw = effectParams.intensity;
	return typeof raw === "number" ? raw : Number.parseFloat(String(raw));
}

export const blurEffectDefinition: EffectDefinition = {
	type: "blur",
	name: "Blur",
	keywords: ["blur", "soft", "defocus"],
	params: [
		{
			key: "intensity",
			label: "Intensity",
			type: "number",
			default: 15,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		type: "webgl",
		passes: [
			{
				fragmentShader: blurFragmentShader,
				uniforms: ({ effectParams, width }) => ({
					u_sigma: Math.max(intensityToSigma(parseIntensity(effectParams), width, 1920), 0.001),
					u_step: 1,
					u_direction: [1, 0],
				}),
			},
			{
				fragmentShader: blurFragmentShader,
				uniforms: ({ effectParams, height }) => ({
					u_sigma: Math.max(intensityToSigma(parseIntensity(effectParams), height, 1080), 0.001),
					u_step: 1,
					u_direction: [0, 1],
				}),
			},
		],
		buildPasses: ({ effectParams, width, height }) => {
			const intensity = parseIntensity(effectParams);
			return buildGaussianBlurPasses({
				sigmaX: intensityToSigma(intensity, width, 1920),
				sigmaY: intensityToSigma(intensity, height, 1080),
			});
		},
	},
};

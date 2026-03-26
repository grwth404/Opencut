import type { ParamDefinition, ParamValues } from "@/lib/params";

export interface Effect {
	id: string;
	type: string;
	params: ParamValues;
	enabled: boolean;
}

export interface ResolvedEffectPass {
	fragmentShader: string;
	uniforms: Record<string, number | number[]>;
}

export interface WebGLEffectPass {
	fragmentShader: string;
	uniforms(params: {
		effectParams: ParamValues;
		width: number;
		height: number;
	}): Record<string, number | number[]>;
}

export interface WebGLEffectRenderer {
	type: "webgl";
	passes: WebGLEffectPass[];
	buildPasses?: (params: {
		effectParams: ParamValues;
		width: number;
		height: number;
	}) => ResolvedEffectPass[];
}

export type EffectRenderer = WebGLEffectRenderer;

export interface EffectDefinition {
	type: string;
	name: string;
	keywords: string[];
	params: ParamDefinition[];
	renderer: EffectRenderer;
}

import { MAX_FEATHER } from "@/masks/feather";
import type { ParamDefinition } from "@/params";
import type {
	BaseMaskParams,
	BuiltinMaskType,
	Mask,
	MaskDefaultContext,
	MaskDefinition,
	MaskParamUpdateArgs,
	MaskRenderer,
	MaskType,
} from "@/masks/types";
import type { HugeiconsIconProps } from "@hugeicons/react";
import { DefinitionRegistry } from "@/params/registry";

export type MaskIconProps = {
	icon: HugeiconsIconProps["icon"];
	strokeWidth?: number;
};

type RegisteredMaskWithoutId = Mask extends infer TMask
	? TMask extends Mask
		? Omit<TMask, "id">
		: never
	: never;

export type BuiltinMaskDefinitionForRegistration = {
	[TType in BuiltinMaskType]: MaskDefinition<TType>;
}[BuiltinMaskType];

export const BASE_MASK_PARAM_DEFINITIONS: ParamDefinition<
	keyof BaseMaskParams & string
>[] = [
	{
		key: "feather",
		label: "Feather",
		type: "number",
		default: 0,
		min: 0,
		max: MAX_FEATHER,
		step: 1,
		unit: "percent",
	},
	{
		key: "strokeWidth",
		label: "Stroke width",
		type: "number",
		default: 0,
		min: 0,
		max: 100,
		step: 1,
	},
	{
		key: "strokeColor",
		label: "Stroke color",
		type: "color",
		default: "#ffffff",
	},
];

export interface RegisteredBuiltinMaskDefinition {
	type: MaskType;
	name: string;
	features: MaskDefinition["features"];
	params: ParamDefinition<string>[];
	renderer: MaskRenderer<BaseMaskParams>;
	interaction: MaskDefinition["interaction"];
	isActive?(params: BaseMaskParams): boolean;
	buildDefault(context: MaskDefaultContext): RegisteredMaskWithoutId;
	computeParamUpdate(
		args: MaskParamUpdateArgs<BaseMaskParams>,
	): ReturnType<MaskDefinition["computeParamUpdate"]>;
	icon: MaskIconProps;
}

export class BuiltinMasksRegistry extends DefinitionRegistry<
	BuiltinMaskType,
	RegisteredBuiltinMaskDefinition
> {
	constructor() {
		super("mask");
	}

	registerMask({
		definition,
		icon,
	}: {
		definition: BuiltinMaskDefinitionForRegistration;
		icon: MaskIconProps;
	}): void {
		const withBaseParams: RegisteredBuiltinMaskDefinition = {
			type: definition.type,
			name: definition.name,
			features: definition.features,
			params: [...definition.params, ...BASE_MASK_PARAM_DEFINITIONS],
			renderer: definition.renderer,
			interaction: definition.interaction,
			isActive: definition.isActive,
			buildDefault: definition.buildDefault,
			computeParamUpdate: definition.computeParamUpdate,
			icon,
		};
		this.register({
			key: definition.type,
			definition: withBaseParams,
		});
	}
}

export const builtinMasksRegistry = new BuiltinMasksRegistry();

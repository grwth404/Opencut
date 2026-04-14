import { MAX_FEATHER } from "@/lib/masks/feather";
import type { ParamDefinition } from "@/lib/params";
import type { BaseMaskParams, MaskDefinition, MaskType } from "@/lib/masks/types";
import type { HugeiconsIconProps } from "@hugeicons/react";
import { DefinitionRegistry } from "@/lib/registry";

export type MaskIconProps = {
	icon: HugeiconsIconProps["icon"];
	strokeWidth?: number;
};

const BASE_MASK_PARAM_DEFINITIONS: ParamDefinition<
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

export type RegisteredMaskDefinition = MaskDefinition<BaseMaskParams> & {
	icon: MaskIconProps;
};

export class MasksRegistry extends DefinitionRegistry<
	MaskType,
	RegisteredMaskDefinition
> {
	constructor() {
		super("mask");
	}

	registerMask<TParams extends BaseMaskParams>({
		definition,
		icon,
	}: {
		definition: MaskDefinition<TParams>;
		icon: MaskIconProps;
	}): void {
		const withBaseParams: RegisteredMaskDefinition = {
			...definition,
			params: [...definition.params, ...BASE_MASK_PARAM_DEFINITIONS],
			icon,
		};
		this.register(definition.type, withBaseParams);
	}
}

export const masksRegistry = new MasksRegistry();

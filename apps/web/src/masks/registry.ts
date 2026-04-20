import { MAX_FEATHER } from "@/masks/feather";
import type { ParamDefinition } from "@/params";
import type {
	BaseMaskParams,
	MaskDefaultContext,
	MaskDefinition,
	MaskInteractionResult,
	MaskSnapArgs,
	MaskSnapResult,
	MaskType,
} from "@/masks/types";
import type { HugeiconsIconProps } from "@hugeicons/react";
import { DefinitionRegistry } from "@/params/registry";

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

export interface RegisteredMaskDefinition {
	type: MaskType;
	name: string;
	features: MaskDefinition<BaseMaskParams>["features"];
	params: ParamDefinition<string>[];
	renderer: MaskDefinition<BaseMaskParams>["renderer"];
	interaction: {
		getInteraction(args: {
			params: BaseMaskParams;
			bounds: Parameters<
				MaskDefinition<BaseMaskParams>["interaction"]["getInteraction"]
			>[0]["bounds"];
			displayScale: number;
			scaleX: number;
			scaleY: number;
		}): MaskInteractionResult;
		snap?(args: MaskSnapArgs<BaseMaskParams>): MaskSnapResult<BaseMaskParams>;
	};
	isActive?: (params: BaseMaskParams) => boolean;
	buildDefault(
		context: MaskDefaultContext,
	): ReturnType<MaskDefinition<BaseMaskParams>["buildDefault"]>;
	computeParamUpdate(
		args: Parameters<MaskDefinition<BaseMaskParams>["computeParamUpdate"]>[0],
	): ReturnType<MaskDefinition<BaseMaskParams>["computeParamUpdate"]>;
	icon: MaskIconProps;
}

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
			type: definition.type,
			name: definition.name,
			features: definition.features,
			params: [...definition.params, ...BASE_MASK_PARAM_DEFINITIONS],
			renderer: definition.renderer,
			interaction: {
				getInteraction(args) {
					return definition.interaction.getInteraction(args as never);
				},
				snap: definition.interaction.snap
					? (args) => definition.interaction.snap?.(args as never) as never
					: undefined,
			},
			isActive: definition.isActive
				? (params) => definition.isActive?.(params as TParams) ?? true
				: undefined,
			buildDefault(context) {
				return definition.buildDefault(context);
			},
			computeParamUpdate(args) {
				return definition.computeParamUpdate(args as never);
			},
			icon,
		};
		this.register(definition.type, withBaseParams);
	}
}

export const masksRegistry = new MasksRegistry();

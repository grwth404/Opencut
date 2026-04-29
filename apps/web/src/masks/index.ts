import type { Mask, MaskDefaultContext, MaskType } from "@/masks/types";
import {
	BASE_MASK_PARAM_DEFINITIONS,
	builtinMasksRegistry,
	type RegisteredBuiltinMaskDefinition,
} from "./registry";
import { freeformMaskDefinition } from "./freeform/definition";
import { generateUUID } from "@/utils/id";
import { SquareIcon } from "@hugeicons/core-free-icons";

export { builtinMasksRegistry } from "./registry";
export { registerBuiltinMasks as registerDefaultMasks } from "./builtin/definitions";

type MaskWithoutId = Mask extends infer TMask
	? TMask extends Mask
		? Omit<TMask, "id">
		: never
	: never;

function withMaskId({ mask, id }: { mask: MaskWithoutId; id: string }): Mask {
	switch (mask.type) {
		case "split":
			return { ...mask, id };
		case "cinematic-bars":
			return { ...mask, id };
		case "rectangle":
			return { ...mask, id };
		case "ellipse":
			return { ...mask, id };
		case "heart":
			return { ...mask, id };
		case "diamond":
			return { ...mask, id };
		case "star":
			return { ...mask, id };
		case "text":
			return { ...mask, id };
		case "freeform":
			return { ...mask, id };
	}
}

export function getMaskDefinition(maskType: MaskType): RegisteredBuiltinMaskDefinition {
	if (maskType === "freeform") {
		return {
			...freeformMaskDefinition,
			params: [...freeformMaskDefinition.params, ...BASE_MASK_PARAM_DEFINITIONS],
			icon: { icon: SquareIcon },
		} as RegisteredBuiltinMaskDefinition;
	}

	return builtinMasksRegistry.get(maskType);
}

export function getMaskDefinitionsForMenu() {
	return [
		...builtinMasksRegistry.getAll(),
		{
			...freeformMaskDefinition,
			name: "Pen tool",
			params: [...freeformMaskDefinition.params, ...BASE_MASK_PARAM_DEFINITIONS],
			icon: { icon: SquareIcon },
		},
	];
}

export function buildDefaultMaskInstance({
	maskType,
	elementSize,
}: {
	maskType: MaskType;
	elementSize?: { width: number; height: number };
}): Mask {
	const definition = getMaskDefinition(maskType);
	const context: MaskDefaultContext = { elementSize };
	return withMaskId({
		mask: definition.buildDefault(context),
		id: generateUUID(),
	});
}

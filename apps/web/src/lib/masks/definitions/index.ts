import type { BaseMaskParams, MaskDefinition } from "@/lib/masks/types";
import { masksRegistry, type MaskIconProps } from "../registry";
import { ellipseMaskDefinition } from "./ellipse";
import { rectangleMaskDefinition } from "./rectangle";
import { splitMaskDefinition } from "./split";
import {
	PanelRightDashedIcon,
	SquareIcon,
	CircleIcon,
} from "@hugeicons/core-free-icons";

function registerDefaultMask<TParams extends BaseMaskParams>({
	definition,
	icon,
}: {
	definition: MaskDefinition<TParams>;
	icon: MaskIconProps;
}) {
	if (masksRegistry.has(definition.type)) {
		return;
	}

	masksRegistry.registerMask({ definition, icon });
}

export function registerDefaultMasks(): void {
	registerDefaultMask({
		definition: splitMaskDefinition,
		icon: { icon: PanelRightDashedIcon, strokeWidth: 1 },
	});
	registerDefaultMask({
		definition: rectangleMaskDefinition,
		icon: { icon: SquareIcon },
	});
	registerDefaultMask({
		definition: ellipseMaskDefinition,
		icon: { icon: CircleIcon },
	});
}

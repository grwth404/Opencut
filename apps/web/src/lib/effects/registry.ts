import { DefinitionRegistry } from "@/lib/registry";
import type { EffectDefinition } from "@/lib/effects/types";

export class EffectsRegistry extends DefinitionRegistry<string, EffectDefinition> {
	constructor() {
		super("effect");
	}
}

export const effectsRegistry = new EffectsRegistry();

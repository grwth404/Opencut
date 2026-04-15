import type { KeybindingConfig } from "@/lib/actions/keybinding";

interface V6State {
	keybindings: KeybindingConfig;
	isCustomized: boolean;
}

export function v6ToV7({ state }: { state: unknown }): unknown {
	const v6 = state as V6State;
	const keybindings = { ...v6.keybindings };

	for (const key of Object.keys(keybindings) as Array<keyof KeybindingConfig>) {
		if (keybindings[key] === ("split-element" as never)) {
			keybindings[key] = "split";
		}
	}

	return { ...v6, keybindings };
}

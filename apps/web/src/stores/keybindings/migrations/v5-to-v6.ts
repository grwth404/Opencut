import type { KeybindingConfig } from "@/lib/actions/keybinding";

interface V5State {
	keybindings: KeybindingConfig;
	isCustomized: boolean;
}

export function v5ToV6({ state }: { state: unknown }): unknown {
	const v5 = state as V5State;
	const keybindings = { ...v5.keybindings };

	if (keybindings.escape === "deselect-all") {
		keybindings.escape = "cancel-interaction";
	}

	return { ...v5, keybindings };
}

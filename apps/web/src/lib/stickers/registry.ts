import type { StickerProvider } from "@/lib/stickers/types";
import { DefinitionRegistry } from "@/lib/registry";

export class StickersRegistry extends DefinitionRegistry<string, StickerProvider> {
	constructor() {
		super("sticker provider");
	}
}

export const stickersRegistry = new StickersRegistry();

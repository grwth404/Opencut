import { EditorCore } from "@/core";
import { Command } from "@/lib/commands/base-command";
import { isMaskableElement, updateElementInTracks } from "@/lib/timeline";
import type { Mask } from "@/lib/masks/types";
import type { TimelineTrack, MaskableElement } from "@/lib/timeline";

export function toggleMaskInvertedOnElement({
	element,
	maskId,
}: {
	element: MaskableElement;
	maskId: string;
}): MaskableElement {
	const currentMasks = element.masks ?? [];
	const toggleMask = <TMask extends Mask>(mask: TMask): TMask => ({
		...mask,
		params: {
			...mask.params,
			inverted: !mask.params.inverted,
		},
	});
	const updatedMasks = currentMasks.map((mask) =>
		mask.id !== maskId ? mask : toggleMask(mask),
	);

	return { ...element, masks: updatedMasks };
}

export class ToggleMaskInvertedCommand extends Command {
	private savedState: TimelineTrack[] | null = null;
	private readonly trackId: string;
	private readonly elementId: string;
	private readonly maskId: string;

	constructor({
		trackId,
		elementId,
		maskId,
	}: {
		trackId: string;
		elementId: string;
		maskId: string;
	}) {
		super();
		this.trackId = trackId;
		this.elementId = elementId;
		this.maskId = maskId;
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		const updatedTracks = updateElementInTracks({
			tracks: this.savedState,
			trackId: this.trackId,
			elementId: this.elementId,
			elementPredicate: isMaskableElement,
			update: (element) =>
				toggleMaskInvertedOnElement({
					element: element as MaskableElement,
					maskId: this.maskId,
				}),
		});

		editor.timeline.updateTracks(updatedTracks);
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}

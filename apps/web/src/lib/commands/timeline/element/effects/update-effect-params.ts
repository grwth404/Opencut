import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import { isVisualElement, updateElementInTracks } from "@/lib/timeline";
import type { ParamValues } from "@/lib/params";
import type { TimelineTrack, VisualElement } from "@/lib/timeline";

function updateEffectParamsOnElement({
	element,
	effectId,
	params,
}: {
	element: VisualElement;
	effectId: string;
	params: Partial<ParamValues>;
}): VisualElement {
	const currentEffects = element.effects ?? [];
	const updated = currentEffects.map((effect) => {
		if (effect.id !== effectId) {
			return effect;
		}

		const nextParams = { ...effect.params };
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined) {
				nextParams[key] = value;
			}
		}

		return { ...effect, params: nextParams };
	});
	return { ...element, effects: updated };
}

export class UpdateClipEffectParamsCommand extends Command {
	private savedState: TimelineTrack[] | null = null;
	private readonly trackId: string;
	private readonly elementId: string;
	private readonly effectId: string;
	private readonly params: Partial<ParamValues>;

	constructor({
		trackId,
		elementId,
		effectId,
		params,
	}: {
		trackId: string;
		elementId: string;
		effectId: string;
		params: Partial<ParamValues>;
	}) {
		super();
		this.trackId = trackId;
		this.elementId = elementId;
		this.effectId = effectId;
		this.params = params;
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		const updatedTracks = updateElementInTracks({
			tracks: this.savedState,
			trackId: this.trackId,
			elementId: this.elementId,
			elementPredicate: isVisualElement,
			update: (element) => {
				return updateEffectParamsOnElement({
					element: element as VisualElement,
					effectId: this.effectId,
					params: this.params,
				});
			},
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

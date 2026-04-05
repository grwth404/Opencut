import { Command, type CommandResult } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/lib/timeline";
import { EditorCore } from "@/core";

export class DeleteElementsCommand extends Command {
	private savedState: TimelineTrack[] | null = null;
	private readonly elements: { trackId: string; elementId: string }[];

	constructor({
		elements,
	}: {
		elements: { trackId: string; elementId: string }[];
	}) {
		super();
		this.elements = elements;
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		const updatedTracks = this.savedState.map((track) => {
			const elementsToDeleteOnTrack = this.elements.filter(
				(target) => target.trackId === track.id,
			);

			if (elementsToDeleteOnTrack.length === 0) {
				return track;
			}

			const elements = track.elements.filter(
				(element) =>
					!this.elements.some(
						(target) =>
							target.trackId === track.id &&
							target.elementId === element.id,
					),
			);

			return { ...track, elements } as typeof track;
		});

		editor.timeline.updateTracks(updatedTracks);

		return {
			select: [],
		};
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}

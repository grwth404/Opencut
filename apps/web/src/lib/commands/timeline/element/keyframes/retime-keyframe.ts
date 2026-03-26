import { EditorCore } from "@/core";
import { resolveAnimationTarget, retimeElementKeyframe } from "@/lib/animation";
import { Command } from "@/lib/commands/base-command";
import { updateElementInTracks } from "@/lib/timeline";
import type { AnimationPath } from "@/lib/animation/types";
import type { TimelineTrack } from "@/lib/timeline";

export class RetimeKeyframeCommand extends Command {
	private savedState: TimelineTrack[] | null = null;
	private readonly trackId: string;
	private readonly elementId: string;
	private readonly propertyPath: AnimationPath;
	private readonly keyframeId: string;
	private readonly nextTime: number;

	constructor({
		trackId,
		elementId,
		propertyPath,
		keyframeId,
		nextTime,
	}: {
		trackId: string;
		elementId: string;
		propertyPath: AnimationPath;
		keyframeId: string;
		nextTime: number;
	}) {
		super();
		this.trackId = trackId;
		this.elementId = elementId;
		this.propertyPath = propertyPath;
		this.keyframeId = keyframeId;
		this.nextTime = nextTime;
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		const updatedTracks = updateElementInTracks({
			tracks: this.savedState,
			trackId: this.trackId,
			elementId: this.elementId,
			update: (element) => {
				if (!resolveAnimationTarget({ element, path: this.propertyPath })) {
					return element;
				}

				const boundedTime = Math.max(0, Math.min(this.nextTime, element.duration));
				return {
					...element,
					animations: retimeElementKeyframe({
						animations: element.animations,
						propertyPath: this.propertyPath,
						keyframeId: this.keyframeId,
						time: boundedTime,
					}),
				};
			},
		});

		editor.timeline.updateTracks(updatedTracks);
	}

	undo(): void {
		if (!this.savedState) {
			return;
		}

		const editor = EditorCore.getInstance();
		editor.timeline.updateTracks(this.savedState);
	}
}

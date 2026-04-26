import { EditorCore } from "@/core";
import { retimeElementKeyframe } from "@/animation";
import { Command, type CommandResult } from "@/commands/base-command";
import { updateElementInSceneTracks } from "@/timeline";
import type { AnimationPath } from "@/animation/types";
import type { SceneTracks } from "@/timeline";
import { resolveAnimationTarget } from "@/timeline/animation-targets";

export class RetimeKeyframeCommand extends Command {
	private savedState: SceneTracks | null = null;
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

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;

		const updatedTracks = updateElementInSceneTracks({
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
		return undefined;
	}

	undo(): void {
		if (!this.savedState) {
			return;
		}

		const editor = EditorCore.getInstance();
		editor.timeline.updateTracks(this.savedState);
	}
}

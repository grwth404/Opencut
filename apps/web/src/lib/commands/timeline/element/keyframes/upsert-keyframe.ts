import { EditorCore } from "@/core";
import { Command, type CommandResult } from "@/lib/commands/base-command";
import { resolveAnimationTarget, upsertPathKeyframe } from "@/lib/animation";
import { updateElementInSceneTracks } from "@/lib/timeline";
import type { SceneTracks } from "@/lib/timeline";
import type {
	AnimationPath,
	AnimationInterpolation,
	AnimationValue,
} from "@/lib/animation/types";

export class UpsertKeyframeCommand extends Command {
	private savedState: SceneTracks | null = null;
	private readonly trackId: string;
	private readonly elementId: string;
	private readonly propertyPath: AnimationPath;
	private readonly time: number;
	private readonly value: AnimationValue;
	private readonly interpolation: AnimationInterpolation | undefined;
	private readonly keyframeId: string | undefined;

	constructor({
		trackId,
		elementId,
		propertyPath,
		time,
		value,
		interpolation,
		keyframeId,
	}: {
		trackId: string;
		elementId: string;
		propertyPath: AnimationPath;
		time: number;
		value: AnimationValue;
		interpolation?: AnimationInterpolation;
		keyframeId?: string;
	}) {
		super();
		this.trackId = trackId;
		this.elementId = elementId;
		this.propertyPath = propertyPath;
		this.time = time;
		this.value = value;
		this.interpolation = interpolation;
		this.keyframeId = keyframeId;
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;

		const updatedTracks = updateElementInSceneTracks({
			tracks: this.savedState,
			trackId: this.trackId,
			elementId: this.elementId,
			update: (element) => {
				const target = resolveAnimationTarget({
					element,
					path: this.propertyPath,
				});
				if (!target) {
					return element;
				}

				const boundedTime = Math.max(0, Math.min(this.time, element.duration));
				return {
					...element,
					animations: upsertPathKeyframe({
						animations: element.animations,
						propertyPath: this.propertyPath,
						time: boundedTime,
						value: this.value,
						interpolation: this.interpolation,
						keyframeId: this.keyframeId,
						kind: target.kind,
						defaultInterpolation: target.defaultInterpolation,
						coerceValue: target.coerceValue,
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

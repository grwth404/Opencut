import { EditorCore } from "@/core";
import { Command, type CommandResult } from "@/lib/commands/base-command";
import {
	buildEffectParamPath,
	resolveAnimationTarget,
	upsertPathKeyframe,
} from "@/lib/animation";
import { updateElementInSceneTracks } from "@/lib/timeline";
import { isVisualElement } from "@/lib/timeline/element-utils";
import type { AnimationInterpolation } from "@/lib/animation/types";
import type { SceneTracks } from "@/lib/timeline";

export class UpsertEffectParamKeyframeCommand extends Command {
	private savedState: SceneTracks | null = null;
	private readonly trackId: string;
	private readonly elementId: string;
	private readonly effectId: string;
	private readonly paramKey: string;
	private readonly time: number;
	private readonly value: number | string | boolean;
	private readonly interpolation: AnimationInterpolation | undefined;
	private readonly keyframeId: string | undefined;

	constructor({
		trackId,
		elementId,
		effectId,
		paramKey,
		time,
		value,
		interpolation,
		keyframeId,
	}: {
		trackId: string;
		elementId: string;
		effectId: string;
		paramKey: string;
		time: number;
		value: number | string | boolean;
		interpolation?: AnimationInterpolation;
		keyframeId?: string;
	}) {
		super();
		this.trackId = trackId;
		this.elementId = elementId;
		this.effectId = effectId;
		this.paramKey = paramKey;
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
			elementPredicate: isVisualElement,
			update: (element) => {
				const boundedTime = Math.max(0, Math.min(this.time, element.duration));
				const propertyPath = buildEffectParamPath({
					effectId: this.effectId,
					paramKey: this.paramKey,
				});
				const target = resolveAnimationTarget({
					element,
					path: propertyPath,
				});
				if (!target) {
					return element;
				}

				const animations = upsertPathKeyframe({
					animations: element.animations,
					propertyPath,
					time: boundedTime,
					value: this.value,
					interpolation: this.interpolation,
					keyframeId: this.keyframeId,
					kind: target.kind,
					defaultInterpolation: target.defaultInterpolation,
					coerceValue: target.coerceValue,
				});
				return { ...element, animations };
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

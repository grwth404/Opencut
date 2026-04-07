import { EditorCore } from "@/core";
import {
	hasKeyframesForPath,
	getKeyframeById,
	removeElementKeyframe,
	resolveAnimationPathValueAtTime,
	resolveAnimationTarget,
} from "@/lib/animation";
import { Command, type CommandResult } from "@/lib/commands/base-command";
import { updateElementInSceneTracks } from "@/lib/timeline";
import type { AnimationPath, AnimationValue } from "@/lib/animation/types";
import type { SceneTracks, TimelineElement } from "@/lib/timeline";

function sampleValueBeforeRemoval({
	element,
	propertyPath,
	keyframeId,
}: {
	element: TimelineElement;
	propertyPath: AnimationPath;
	keyframeId: string;
}): AnimationValue | null {
	const target = resolveAnimationTarget({ element, path: propertyPath });
	if (!target) {
		return null;
	}
	const baseValue = target.getBaseValue();
	if (baseValue === null) {
		return null;
	}

	const keyframe = getKeyframeById({
		animations: element.animations,
		propertyPath,
		keyframeId,
	});
	if (!keyframe) {
		return null;
	}

	return resolveAnimationPathValueAtTime({
		animations: element.animations,
		propertyPath,
		localTime: keyframe.time,
		fallbackValue: baseValue,
	});
}

function removeKeyframeAndPersist({
	element,
	propertyPath,
	keyframeId,
}: {
	element: TimelineElement;
	propertyPath: AnimationPath;
	keyframeId: string;
}): TimelineElement {
	const target = resolveAnimationTarget({ element, path: propertyPath });
	if (!target) {
		return element;
	}

	const valueBefore = sampleValueBeforeRemoval({
		element,
		propertyPath,
		keyframeId,
	});

	const nextAnimations = removeElementKeyframe({
		animations: element.animations,
		propertyPath,
		keyframeId,
	});

	const isChannelNowEmpty = !hasKeyframesForPath({
		animations: nextAnimations,
		propertyPath,
	});
	const shouldPersistToBase = isChannelNowEmpty && valueBefore !== null;

	const baseElement = shouldPersistToBase
		? target.setBaseValue({ value: valueBefore })
		: element;

	return { ...baseElement, animations: nextAnimations };
}

export class RemoveKeyframeCommand extends Command {
	private savedState: SceneTracks | null = null;
	private readonly trackId: string;
	private readonly elementId: string;
	private readonly propertyPath: AnimationPath;
	private readonly keyframeId: string;

	constructor({
		trackId,
		elementId,
		propertyPath,
		keyframeId,
	}: {
		trackId: string;
		elementId: string;
		propertyPath: AnimationPath;
		keyframeId: string;
	}) {
		super();
		this.trackId = trackId;
		this.elementId = elementId;
		this.propertyPath = propertyPath;
		this.keyframeId = keyframeId;
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;

		const updatedTracks = updateElementInSceneTracks({
			tracks: this.savedState,
			trackId: this.trackId,
			elementId: this.elementId,
			update: (element) =>
				removeKeyframeAndPersist({
					element,
					propertyPath: this.propertyPath,
					keyframeId: this.keyframeId,
				}),
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

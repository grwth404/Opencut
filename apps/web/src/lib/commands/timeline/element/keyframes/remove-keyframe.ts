import { EditorCore } from "@/core";
import {
	getChannel,
	getChannelValueAtTime,
	removeElementKeyframe,
	resolveAnimationTarget,
} from "@/lib/animation";
import { Command } from "@/lib/commands/base-command";
import { updateElementInTracks } from "@/lib/timeline";
import type { AnimationPath, AnimationValue } from "@/lib/animation/types";
import type { TimelineElement, TimelineTrack } from "@/lib/timeline";

function sampleValueBeforeRemoval({
	element,
	propertyPath,
	keyframeId,
}: {
	element: TimelineElement;
	propertyPath: AnimationPath;
	keyframeId: string;
}): AnimationValue | null {
	const channel = getChannel({
		animations: element.animations,
		propertyPath,
	});
	const keyframe = channel?.keyframes.find(
		(candidate) => candidate.id === keyframeId,
	);
	if (!channel || !keyframe) {
		return null;
	}

	const target = resolveAnimationTarget({ element, path: propertyPath });
	if (!target) {
		return null;
	}
	const baseValue = target.getBaseValue();
	if (baseValue === null) {
		return null;
	}

	return getChannelValueAtTime({
		channel,
		time: keyframe.time,
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

	const isChannelNowEmpty =
		getChannel({ animations: nextAnimations, propertyPath }) === undefined;
	const shouldPersistToBase = isChannelNowEmpty && valueBefore !== null;

	const baseElement = shouldPersistToBase
		? target.setBaseValue(valueBefore)
		: element;

	return { ...baseElement, animations: nextAnimations };
}

export class RemoveKeyframeCommand extends Command {
	private savedState: TimelineTrack[] | null = null;
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

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		const updatedTracks = updateElementInTracks({
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
	}

	undo(): void {
		if (!this.savedState) {
			return;
		}

		const editor = EditorCore.getInstance();
		editor.timeline.updateTracks(this.savedState);
	}
}

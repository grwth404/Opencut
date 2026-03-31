import { cloneAnimations, getChannel } from "@/lib/animation";
import type { ElementAnimations } from "@/lib/animation/types";
import type { MediaAsset } from "@/lib/media/types";
import { DEFAULTS } from "@/lib/timeline/defaults";
import type {
	CreateUploadAudioElement,
	TimelineElement,
	AudioElement,
	VideoElement,
} from "../types";

export function isSourceAudioEnabled({
	element,
}: {
	element: VideoElement;
}): boolean {
	return element.isSourceAudioEnabled !== false;
}

export function isSourceAudioSeparated({
	element,
}: {
	element: VideoElement;
}): boolean {
	return !isSourceAudioEnabled({ element });
}

export function canExtractSourceAudio({
	element,
	mediaAsset,
}: {
	element: TimelineElement;
	mediaAsset: MediaAsset | null | undefined;
}): element is VideoElement {
	return (
		element.type === "video" &&
		isSourceAudioEnabled({ element }) &&
		!!mediaAsset &&
		mediaAsset.hasAudio !== false
	);
}

export function canRecoverSourceAudio({
	element,
}: {
	element: TimelineElement;
}): element is VideoElement {
	return element.type === "video" && isSourceAudioSeparated({ element });
}

export function canToggleSourceAudio({
	element,
	mediaAsset,
}: {
	element: TimelineElement;
	mediaAsset: MediaAsset | null | undefined;
}): element is VideoElement {
	return (
		canRecoverSourceAudio({ element }) ||
		canExtractSourceAudio({ element, mediaAsset })
	);
}

export function doesElementHaveEnabledAudio({
	element,
	mediaAsset,
}: {
	element: AudioElement | VideoElement;
	mediaAsset?: MediaAsset | null;
}): boolean {
	if (element.type === "audio") {
		return true;
	}

	return !!mediaAsset && mediaAsset.hasAudio !== false && isSourceAudioEnabled({ element });
}

export function buildSeparatedAudioElement({
	sourceElement,
}: {
	sourceElement: VideoElement;
}): CreateUploadAudioElement {
	return {
		type: "audio",
		sourceType: "upload",
		mediaId: sourceElement.mediaId,
		name: sourceElement.name,
		duration: sourceElement.duration,
		startTime: sourceElement.startTime,
		trimStart: sourceElement.trimStart,
		trimEnd: sourceElement.trimEnd,
		sourceDuration: sourceElement.sourceDuration,
		volume: sourceElement.volume ?? DEFAULTS.element.volume,
		muted: sourceElement.muted ?? false,
		retime: sourceElement.retime
			? {
					rate: sourceElement.retime.rate,
					maintainPitch: sourceElement.retime.maintainPitch,
				}
			: undefined,
		animations: cloneVolumeAnimations({
			animations: sourceElement.animations,
		}),
	};
}

export function getSourceAudioActionLabel({
	element,
}: {
	element: VideoElement;
}): "Extract audio" | "Recover audio" {
	return isSourceAudioSeparated({ element }) ? "Recover audio" : "Extract audio";
}

function cloneVolumeAnimations({
	animations,
}: {
	animations: ElementAnimations | undefined;
}): ElementAnimations | undefined {
	const volumeChannel = getChannel({ animations, propertyPath: "volume" });
	if (!volumeChannel) {
		return undefined;
	}

	return cloneAnimations({
		animations: {
			channels: {
				volume: volumeChannel,
			},
		},
		shouldRegenerateKeyframeIds: true,
	});
}

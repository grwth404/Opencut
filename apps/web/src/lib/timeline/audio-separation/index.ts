import { cloneAnimations } from "@/lib/animation";
import type { ElementAnimations } from "@/lib/animation/types";
import type { MediaAsset } from "@/lib/media/types";
import { DEFAULTS } from "@/lib/timeline/defaults";
import type {
	CreateUploadAudioElement,
	TimelineElement,
	AudioElement,
	VideoElement,
} from "../types";

type MediaAudioState = Pick<MediaAsset, "hasAudio">;

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

export function canExtractSourceAudio(
	element: TimelineElement,
	mediaAsset: MediaAudioState | null | undefined,
): element is VideoElement {
	return (
		element.type === "video" &&
		isSourceAudioEnabled({ element }) &&
		!!mediaAsset &&
		mediaAsset.hasAudio !== false
	);
}

export function canRecoverSourceAudio(
	element: TimelineElement,
): element is VideoElement {
	return element.type === "video" && isSourceAudioSeparated({ element });
}

export function canToggleSourceAudio(
	element: TimelineElement,
	mediaAsset: MediaAudioState | null | undefined,
): element is VideoElement {
	return (
		canRecoverSourceAudio(element) || canExtractSourceAudio(element, mediaAsset)
	);
}

export function doesElementHaveEnabledAudio({
	element,
	mediaAsset,
}: {
	element: AudioElement | VideoElement;
	mediaAsset?: MediaAudioState | null;
}): boolean {
	if (element.type === "audio") {
		return true;
	}

	return (
		!!mediaAsset &&
		mediaAsset.hasAudio !== false &&
		isSourceAudioEnabled({ element })
	);
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
	return isSourceAudioSeparated({ element })
		? "Recover audio"
		: "Extract audio";
}

function cloneVolumeAnimations({
	animations,
}: {
	animations: ElementAnimations | undefined;
}): ElementAnimations | undefined {
	const volumeBinding = animations?.bindings.volume;
	if (!volumeBinding) {
		return undefined;
	}

	const subsetChannels = Object.fromEntries(
		volumeBinding.components.flatMap((component) => {
			const channel = animations?.channels[component.channelId];
			return channel ? [[component.channelId, channel] as const] : [];
		}),
	);
	if (Object.keys(subsetChannels).length === 0) {
		return undefined;
	}

	return cloneAnimations({
		animations: {
			bindings: {
				volume: volumeBinding,
			},
			channels: subsetChannels,
		},
		shouldRegenerateKeyframeIds: true,
	});
}

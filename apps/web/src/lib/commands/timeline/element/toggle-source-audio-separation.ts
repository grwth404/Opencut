import { EditorCore } from "@/core";
import { Command } from "@/lib/commands/base-command";
import {
	buildSeparatedAudioElement,
	canExtractSourceAudio,
	canRecoverSourceAudio,
} from "@/lib/timeline/audio-separation";
import {
	applyPlacement,
	resolveTrackPlacement,
} from "@/lib/timeline/placement";
import { updateElementInTracks } from "@/lib/timeline/track-element-update";
import type { TimelineTrack, VideoElement } from "@/lib/timeline/types";
import { generateUUID } from "@/utils/id";

export class ToggleSourceAudioSeparationCommand extends Command {
	private savedState: TimelineTrack[] | null = null;

	constructor(
		private readonly params: {
			trackId: string;
			elementId: string;
		},
	) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		const trackIndex = this.savedState.findIndex(
			(track) => track.id === this.params.trackId,
		);
		if (trackIndex < 0) {
			return;
		}

		const sourceTrack = this.savedState[trackIndex];
		const sourceElement = sourceTrack.elements.find(
			(element) => element.id === this.params.elementId,
		);
		if (!sourceElement) {
			return;
		}

		if (canRecoverSourceAudio({ element: sourceElement })) {
			editor.timeline.updateTracks(
				updateSourceAudioEnabled({
					tracks: this.savedState,
					trackId: this.params.trackId,
					elementId: this.params.elementId,
					isSourceAudioEnabled: true,
				}),
			);
			return;
		}

		const mediaAsset = editor
			.media
			.getAssets()
			.find((asset) =>
				sourceElement.type === "video" ? asset.id === sourceElement.mediaId : false,
			);
		if (!canExtractSourceAudio({ element: sourceElement, mediaAsset })) {
			return;
		}
		if (sourceElement.duration <= 0) {
			return;
		}

		const separatedAudioElement = {
			...buildSeparatedAudioElement({
				sourceElement,
			}),
			id: generateUUID(),
		};
		const placementResult = resolveTrackPlacement({
			tracks: this.savedState,
			trackType: "audio",
			timeSpans: [
				{
					startTime: separatedAudioElement.startTime,
					duration: separatedAudioElement.duration,
				},
			],
			strategy: { type: "aboveSource", sourceTrackIndex: trackIndex },
		});
		if (!placementResult) {
			return;
		}

		const appliedPlacement = applyPlacement({
			tracks: this.savedState,
			placementResult,
			elements: [separatedAudioElement],
		});
		if (!appliedPlacement) {
			return;
		}

		editor.timeline.updateTracks(
			updateSourceAudioEnabled({
				tracks: appliedPlacement.updatedTracks,
				trackId: this.params.trackId,
				elementId: this.params.elementId,
				isSourceAudioEnabled: false,
			}),
		);
	}

	undo(): void {
		if (!this.savedState) {
			return;
		}

		const editor = EditorCore.getInstance();
		editor.timeline.updateTracks(this.savedState);
	}
}

function updateSourceAudioEnabled({
	tracks,
	trackId,
	elementId,
	isSourceAudioEnabled,
}: {
	tracks: TimelineTrack[];
	trackId: string;
	elementId: string;
	isSourceAudioEnabled: boolean;
}): TimelineTrack[] {
	return updateElementInTracks({
		tracks,
		trackId,
		elementId,
		elementPredicate: (element): element is VideoElement => element.type === "video",
		update: (element) => ({
			...element,
			isSourceAudioEnabled,
		}),
	});
}

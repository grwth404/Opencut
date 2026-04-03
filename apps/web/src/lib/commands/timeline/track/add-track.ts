import { Command, type CommandResult } from "@/lib/commands/base-command";
import type { TrackType, TimelineTrack } from "@/lib/timeline";
import { generateUUID } from "@/utils/id";
import { EditorCore } from "@/core";
import {
	buildEmptyTrack,
	getDefaultInsertIndexForTrack,
} from "@/lib/timeline/placement";

export class AddTrackCommand extends Command {
	private trackId: string;
	private savedState: TimelineTrack[] | null = null;

	constructor(
		private type: TrackType,
		private index?: number,
	) {
		super();
		this.trackId = generateUUID();
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		const newTrack: TimelineTrack = buildEmptyTrack({
			id: this.trackId,
			type: this.type,
		});

		const updatedTracks = [...(this.savedState || [])];
		const insertIndex =
			this.index ??
			getDefaultInsertIndexForTrack({
				tracks: updatedTracks,
				trackType: this.type,
			});
		updatedTracks.splice(insertIndex, 0, newTrack);

		editor.timeline.updateTracks(updatedTracks);
		return undefined;
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}

	getTrackId(): string {
		return this.trackId;
	}
}

import { Command, type CommandResult } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/lib/timeline";
import { EditorCore } from "@/core";

export class TracksSnapshotCommand extends Command {
	constructor(
		private before: TimelineTrack[],
		private after: TimelineTrack[],
	) {
		super();
	}

	execute(): CommandResult | undefined {
		EditorCore.getInstance().timeline.updateTracks(this.after);
		return undefined;
	}

	undo(): void {
		EditorCore.getInstance().timeline.updateTracks(this.before);
	}
}

import type { EditorSelectionPatch } from "@/lib/selection/editor-selection";

export interface CommandResult {
	selection?: EditorSelectionPatch;
}

export abstract class Command {
	abstract execute(): CommandResult | undefined;

	undo(): void {
		throw new Error("Undo not implemented for this command");
	}

	redo(): CommandResult | undefined {
		return this.execute();
	}
}

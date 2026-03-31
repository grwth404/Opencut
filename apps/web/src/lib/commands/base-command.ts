import type { ElementRef } from "@/lib/timeline/types";

export interface CommandResult {
	select?: ElementRef[];
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

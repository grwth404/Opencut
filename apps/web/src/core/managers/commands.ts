import type { EditorCore } from "@/core";
import type { Command, CommandResult } from "@/lib/commands";
import type { ElementRef } from "@/lib/timeline/types";

interface CommandHistoryEntry {
	command: Command;
	previousSelection: ElementRef[];
	selectionOverride?: ElementRef[];
}

export class CommandManager {
	private history: CommandHistoryEntry[] = [];
	private redoStack: CommandHistoryEntry[] = [];
	private reactors: Array<() => void> = [];

	constructor(private editor: EditorCore) {}

	execute({ command }: { command: Command }): Command {
		const previousSelection = this.getSelectionSnapshot();
		const result = command.execute();
		const selectionOverride = this.applySelectionOverride(result);
		this.runReactors();
		this.history.push({
			command,
			previousSelection,
			selectionOverride,
		});
		this.redoStack = [];
		return command;
	}

	push({ command }: { command: Command }): void {
		this.history.push({
			command,
			previousSelection: this.getSelectionSnapshot(),
		});
		this.redoStack = [];
	}

	registerReactor(reactor: () => void): void {
		this.reactors.push(reactor);
	}

	undo(): void {
		if (this.history.length === 0) return;
		const entry = this.history.pop();
		entry?.command.undo();
		if (entry) {
			// Only restore selection for commands that explicitly changed it.
			// Commands without selection intent leave selection untouched,
			// preserving any UI-driven selection changes (clicks, box select)
			// that happened between commands. Commands that remove elements
			// must declare { select: [] } to clear stale refs.
			if (entry.selectionOverride !== undefined) {
				this.editor.selection.setSelectedElements({
					elements: [...entry.previousSelection],
				});
			}
			this.redoStack.push(entry);
		}
	}

	redo(): void {
		if (this.redoStack.length === 0) return;
		const entry = this.redoStack.pop();
		if (!entry) {
			return;
		}

		const previousSelection = this.getSelectionSnapshot();
		const result = entry.command.redo();
		const selectionOverride = this.applySelectionOverride(result);
		this.runReactors();

		this.history.push({
			command: entry.command,
			previousSelection,
			selectionOverride,
		});
	}

	canUndo(): boolean {
		return this.history.length > 0;
	}

	canRedo(): boolean {
		return this.redoStack.length > 0;
	}

	clear(): void {
		this.history = [];
		this.redoStack = [];
	}

	private getSelectionSnapshot(): ElementRef[] {
		return [...this.editor.selection.getSelectedElements()];
	}

	private applySelectionOverride(
		result: CommandResult | undefined,
	): ElementRef[] | undefined {
		if (result?.select === undefined) {
			return undefined;
		}

		const selectionOverride = [...result.select];
		this.editor.selection.setSelectedElements({ elements: selectionOverride });
		return selectionOverride;
	}

	private runReactors(): void {
		for (const reactor of this.reactors) {
			reactor();
		}
	}
}

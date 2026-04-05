import { Command, type CommandResult } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type {
	TimelineTrack,
	TimelineElement,
	TrackType,
} from "@/lib/timeline";
import {
	buildEmptyTrack,
	validateElementTrackCompatibility,
	enforceMainTrackStart,
} from "@/lib/timeline/placement";

export class MoveElementCommand extends Command {
	private savedState: TimelineTrack[] | null = null;
	private readonly sourceTrackId: string;
	private readonly targetTrackId: string;
	private readonly elementId: string;
	private readonly newStartTime: number;
	private readonly createTrack: { type: TrackType; index: number } | undefined;

	constructor({
		sourceTrackId,
		targetTrackId,
		elementId,
		newStartTime,
		createTrack,
	}: {
		sourceTrackId: string;
		targetTrackId: string;
		elementId: string;
		newStartTime: number;
		createTrack?: { type: TrackType; index: number };
	}) {
		super();
		this.sourceTrackId = sourceTrackId;
		this.targetTrackId = targetTrackId;
		this.elementId = elementId;
		this.newStartTime = newStartTime;
		this.createTrack = createTrack;
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		const sourceTrack = this.savedState.find(
			(track) => track.id === this.sourceTrackId,
		);
		const element = sourceTrack?.elements.find(
			(trackElement) => trackElement.id === this.elementId,
		);

		if (!sourceTrack || !element) {
			throw new Error("Source track or element not found");
		}

		let targetTrack = this.savedState.find((track) => track.id === this.targetTrackId);
		let tracksToUpdate = this.savedState;
		if (!targetTrack && this.createTrack) {
			const newTrack = buildEmptyTrack({
				id: this.targetTrackId,
				type: this.createTrack.type,
			});
			tracksToUpdate = [...this.savedState];
			tracksToUpdate.splice(this.createTrack.index, 0, newTrack);
			targetTrack = newTrack;
		}
		if (!targetTrack) {
			throw new Error("Target track not found");
		}

		const validation = validateElementTrackCompatibility({
			element,
			track: targetTrack,
		});

		if (!validation.isValid) {
			throw new Error(validation.errorMessage);
		}

		const adjustedStartTime = enforceMainTrackStart({
			tracks: tracksToUpdate,
			targetTrackId: this.targetTrackId,
			requestedStartTime: this.newStartTime,
			excludeElementId: this.elementId,
		});

		// keyframe times remain clip-local, so moving only changes element startTime.
		const movedElement: TimelineElement = {
			...element,
			startTime: adjustedStartTime,
		};

		const isSameTrack = this.sourceTrackId === this.targetTrackId;

		const updatedTracks = tracksToUpdate.map((track): TimelineTrack => {
			if (isSameTrack && track.id === this.sourceTrackId) {
				return {
					...track,
					elements: track.elements.map((trackElement) =>
						trackElement.id === this.elementId ? movedElement : trackElement,
					),
				} as typeof track;
			}

			if (track.id === this.sourceTrackId) {
				const remainingElements = track.elements.filter(
					(trackElement) => trackElement.id !== this.elementId,
				);
				return { ...track, elements: remainingElements } as typeof track;
			}

			if (track.id === this.targetTrackId) {
				return {
					...track,
					elements: [...track.elements, movedElement],
				} as typeof track;
			}

			return track;
		});

		editor.timeline.updateTracks(updatedTracks);
		return undefined;
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}

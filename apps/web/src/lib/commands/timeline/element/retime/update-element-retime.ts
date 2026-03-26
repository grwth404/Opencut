import { EditorCore } from "@/core";
import { clampRetimeRate } from "@/constants/retime-constants";
import { clampAnimationsToDuration } from "@/lib/animation";
import { Command } from "@/lib/commands/base-command";
import { getTimelineDurationForSourceSpan, getSourceSpanAtClipTime } from "@/lib/retime";
import { isRetimableElement, updateElementInTracks } from "@/lib/timeline";
import type { RetimeConfig, TimelineTrack } from "@/lib/timeline";

function getSourceDuration({
	trimStart,
	trimEnd,
	duration,
	sourceDuration,
	retime,
}: {
	trimStart: number;
	trimEnd: number;
	duration: number;
	sourceDuration?: number;
	retime?: RetimeConfig;
}): number {
	if (typeof sourceDuration === "number") {
		return sourceDuration;
	}

	return (
		trimStart +
		getSourceSpanAtClipTime({
			clipTime: duration,
			retime,
		}) +
		trimEnd
	);
}

export class UpdateElementRetimeCommand extends Command {
	private savedState: TimelineTrack[] | null = null;
	private readonly trackId: string;
	private readonly elementId: string;
	private readonly retime: RetimeConfig | undefined;

	constructor({
		trackId,
		elementId,
		retime,
	}: {
		trackId: string;
		elementId: string;
		retime?: RetimeConfig;
	}) {
		super();
		this.trackId = trackId;
		this.elementId = elementId;
		this.retime = retime;
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		const updatedTracks = updateElementInTracks({
			tracks: this.savedState,
			trackId: this.trackId,
			elementId: this.elementId,
			elementPredicate: isRetimableElement,
			update: (element) => {
				if (!isRetimableElement(element)) {
					return element;
				}

				const nextRetime = this.retime
					? {
							...this.retime,
							rate: clampRetimeRate({ rate: this.retime.rate }),
						}
					: undefined;
				const sourceDuration = getSourceDuration({
					trimStart: element.trimStart,
					trimEnd: element.trimEnd,
					duration: element.duration,
					sourceDuration: element.sourceDuration,
					retime: element.retime,
				});
				const visibleSourceSpan = Math.max(
					0,
					sourceDuration - element.trimStart - element.trimEnd,
				);
				const nextDuration = getTimelineDurationForSourceSpan({
					sourceSpan: visibleSourceSpan,
					retime: nextRetime,
				});

				return {
					...element,
					retime: nextRetime,
					duration: nextDuration,
					animations: clampAnimationsToDuration({
						animations: element.animations,
						duration: nextDuration,
					}),
				};
			},
		});

		editor.timeline.updateTracks(updatedTracks);
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}

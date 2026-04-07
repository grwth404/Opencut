import { Command, type CommandResult } from "@/lib/commands/base-command";
import type { SceneTracks, TimelineElement } from "@/lib/timeline";
import { generateUUID } from "@/utils/id";
import { EditorCore } from "@/core";
import { isRetimableElement } from "@/lib/timeline";
import { splitAnimationsAtTime } from "@/lib/animation";
import { getSourceSpanAtClipTime } from "@/lib/retime";

export class SplitElementsCommand extends Command {
	private savedState: SceneTracks | null = null;
	private rightSideElements: { trackId: string; elementId: string }[] = [];
	private readonly elements: { trackId: string; elementId: string }[];
	private readonly splitTime: number;
	private readonly retainSide: "both" | "left" | "right";

	constructor({
		elements,
		splitTime,
		retainSide = "both",
	}: {
		elements: { trackId: string; elementId: string }[];
		splitTime: number;
		retainSide?: "both" | "left" | "right";
	}) {
		super();
		this.elements = elements;
		this.splitTime = splitTime;
		this.retainSide = retainSide;
	}

	getRightSideElements(): { trackId: string; elementId: string }[] {
		return this.rightSideElements;
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;
		this.rightSideElements = [];

		const splitTrack = <TTrack extends { id: string; elements: TimelineElement[] }>(
			track: TTrack,
		): TTrack => {
			const elementsToSplit = this.elements.filter(
				(target) => target.trackId === track.id,
			);

			if (elementsToSplit.length === 0) {
				return track;
			}

			let elements = track.elements.flatMap((element) => {
				const shouldSplit = elementsToSplit.some(
					(target) => target.elementId === element.id,
				);

				if (!shouldSplit) {
					return [element];
				}

				const effectiveStart = element.startTime;
				const effectiveEnd = element.startTime + element.duration;

				if (
					this.splitTime <= effectiveStart ||
					this.splitTime >= effectiveEnd
				) {
					return [element];
				}

				const relativeTime = this.splitTime - element.startTime;
				const leftVisibleDuration = relativeTime;
				const rightVisibleDuration = element.duration - relativeTime;
				const retimeRef = isRetimableElement(element)
					? element.retime
					: undefined;
				const leftSourceSpan = getSourceSpanAtClipTime({
					clipTime: leftVisibleDuration,
					retime: retimeRef,
				});
				const totalSourceSpan = getSourceSpanAtClipTime({
					clipTime: element.duration,
					retime: retimeRef,
				});
				const rightSourceSpan = totalSourceSpan - leftSourceSpan;
				const { leftAnimations, rightAnimations } = splitAnimationsAtTime({
					animations: element.animations,
					splitTime: relativeTime,
					shouldIncludeSplitBoundary: true,
				});

				if (this.retainSide === "left") {
					return [
					{
						...element,
						duration: leftVisibleDuration,
						trimEnd: element.trimEnd + rightSourceSpan,
						name: `${element.name} (left)`,
						animations: leftAnimations,
						...(retimeRef !== undefined ? { retime: retimeRef } : {}),
					},
				];
			}

			if (this.retainSide === "right") {
				const newId = generateUUID();
				this.rightSideElements.push({
					trackId: track.id,
					elementId: newId,
				});
				return [
					{
						...element,
						id: newId,
						startTime: this.splitTime,
						duration: rightVisibleDuration,
						trimStart: element.trimStart + leftSourceSpan,
						name: `${element.name} (right)`,
						animations: rightAnimations,
						...(retimeRef !== undefined ? { retime: retimeRef } : {}),
					},
				];
			}

			// "both" - split into two pieces
			const secondElementId = generateUUID();
			this.rightSideElements.push({
				trackId: track.id,
				elementId: secondElementId,
			});

			return [
				{
					...element,
					duration: leftVisibleDuration,
					trimEnd: element.trimEnd + rightSourceSpan,
					name: `${element.name} (left)`,
					animations: leftAnimations,
					...(retimeRef !== undefined ? { retime: retimeRef } : {}),
				},
				{
					...element,
					id: secondElementId,
					startTime: this.splitTime,
					duration: rightVisibleDuration,
					trimStart: element.trimStart + leftSourceSpan,
					name: `${element.name} (right)`,
					animations: rightAnimations,
					...(retimeRef !== undefined ? { retime: retimeRef } : {}),
				},
			];
			});

			return { ...track, elements } as TTrack;
		};

		const updatedTracks: SceneTracks = {
			overlay: this.savedState.overlay.map((track) => splitTrack(track)),
			main: splitTrack(this.savedState.main),
			audio: this.savedState.audio.map((track) => splitTrack(track)),
		};

		editor.timeline.updateTracks(updatedTracks);

		if (this.rightSideElements.length > 0) {
			return {
				select: this.rightSideElements,
			};
		}
		return undefined;
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}

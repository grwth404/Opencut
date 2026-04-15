import { EditorCore } from "@/core";
import { Command, type CommandResult } from "@/lib/commands/base-command";
import {
	getCustomMaskClosedStateAfterPointRemoval,
	removeCustomMaskPoints,
} from "@/lib/masks/custom-path";
import type { CustomMask } from "@/lib/masks/types";
import { isMaskableElement, updateElementInSceneTracks } from "@/lib/timeline";
import type { MaskableElement, SceneTracks } from "@/lib/timeline";

function deletePointsFromCustomMask({
	mask,
	pointIds,
}: {
	mask: CustomMask;
	pointIds: string[];
}): CustomMask {
	const points = mask.params.path;
	const nextPoints = removeCustomMaskPoints({ points, pointIds });
	if (nextPoints.length === points.length) {
		return mask;
	}

	return {
		...mask,
		params: {
			...mask.params,
			path: nextPoints,
			closed: getCustomMaskClosedStateAfterPointRemoval({
				wasClosed: mask.params.closed,
				remainingPointCount: nextPoints.length,
			}),
		},
	};
}

function deletePointsFromElementMask({
	element,
	maskId,
	pointIds,
}: {
	element: MaskableElement;
	maskId: string;
	pointIds: string[];
}): { element: MaskableElement; didDeletePoints: boolean } {
	const currentMasks = element.masks ?? [];
	let didDeletePoints = false;
	const nextMasks = currentMasks.map((mask) => {
		if (mask.id !== maskId || mask.type !== "custom") {
			return mask;
		}

		const nextMask = deletePointsFromCustomMask({
			mask,
			pointIds,
		});
		didDeletePoints ||= nextMask !== mask;
		return nextMask;
	});

	return {
		element: didDeletePoints ? { ...element, masks: nextMasks } : element,
		didDeletePoints,
	};
}

export class DeleteCustomMaskPointsCommand extends Command {
	private savedState: SceneTracks | null = null;
	private readonly trackId: string;
	private readonly elementId: string;
	private readonly maskId: string;
	private readonly pointIds: string[];

	constructor({
		trackId,
		elementId,
		maskId,
		pointIds,
	}: {
		trackId: string;
		elementId: string;
		maskId: string;
		pointIds: string[];
	}) {
		super();
		this.trackId = trackId;
		this.elementId = elementId;
		this.maskId = maskId;
		this.pointIds = pointIds;
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;

		let didDeletePoints = false;
		const updatedTracks = updateElementInSceneTracks({
			tracks: this.savedState,
			trackId: this.trackId,
			elementId: this.elementId,
			elementPredicate: isMaskableElement,
			update: (element) => {
				const result = deletePointsFromElementMask({
					element: element as MaskableElement,
					maskId: this.maskId,
					pointIds: this.pointIds,
				});
				didDeletePoints ||= result.didDeletePoints;
				return result.element;
			},
		});

		if (didDeletePoints) {
			editor.timeline.updateTracks(updatedTracks);
			return {
				selection: {
					selectedMaskPoints: null,
				},
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

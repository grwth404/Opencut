import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import { toast } from "sonner";
import type { MediaAsset } from "@/lib/media/types";
import { generateUUID } from "@/utils/id";
import { storageService } from "@/services/storage/service";
import { hasMediaId } from "@/lib/timeline/element-utils";
import { getHighestImportedVideoFps } from "@/lib/project/fps";
import { UpdateProjectSettingsCommand } from "@/lib/commands/project";

export class AddMediaAssetCommand extends Command {
	private assetId: string;
	private savedAssets: MediaAsset[] | null = null;
	private createdAsset: MediaAsset | null = null;
	private previousProjectFps: number | null = null;
	private appliedProjectFps: number | null = null;

	constructor(
		private projectId: string,
		private asset: Omit<MediaAsset, "id">,
	) {
		super();
		this.assetId = generateUUID();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedAssets = [...editor.media.getAssets()];

		this.createdAsset = {
			...this.asset,
			id: this.assetId,
		};

		editor.media.setAssets({
			assets: [...this.savedAssets, this.createdAsset],
		});
		this.previousProjectFps = editor.project.getActiveOrNull()?.settings.fps ?? null;
		this.appliedProjectFps = editor.project.ratchetFpsForImportedMedia({
			importedAssets: [this.createdAsset],
		});

		storageService
			.saveMediaAsset({
				projectId: this.projectId,
				mediaAsset: this.createdAsset,
			})
			.catch((error) => {
				console.error("Failed to save media item:", error);

				const currentAssets = editor.media.getAssets();
				editor.media.setAssets({
					assets: currentAssets.filter((asset) => asset.id !== this.assetId),
				});

				const currentTracks = editor.timeline.getTracks();
				const orphanedElements: Array<{ trackId: string; elementId: string }> =
					[];

				for (const track of currentTracks) {
					for (const element of track.elements) {
						if (hasMediaId(element) && element.mediaId === this.assetId) {
							orphanedElements.push({
								trackId: track.id,
								elementId: element.id,
							});
						}
					}
				}

				if (orphanedElements.length > 0) {
					editor.timeline.deleteElements({ elements: orphanedElements });
				}

				this.restoreProjectFpsAfterFailedSave({ editor });

				if (storageService.isQuotaExceededError({ error })) {
					toast.error("Not enough browser storage", {
						description: error instanceof Error ? error.message : undefined,
					});
				}
			});
	}

	undo(): void {
		if (this.savedAssets) {
			const editor = EditorCore.getInstance();
			editor.media.setAssets({ assets: this.savedAssets });

			if (this.createdAsset) {
				storageService
					.deleteMediaAsset({ projectId: this.projectId, id: this.assetId })
					.catch((error) => {
						console.error("Failed to delete media item on undo:", error);
					});
			}
		}
	}

	getAssetId(): string {
		return this.assetId;
	}

	private restoreProjectFpsAfterFailedSave({
		editor,
	}: {
		editor: EditorCore;
	}): void {
		if (this.previousProjectFps === null || this.appliedProjectFps === null) return;

		const activeProject = editor.project.getActiveOrNull();
		if (!activeProject) return;
		if (activeProject.settings.fps !== this.appliedProjectFps) return;

		const highestRemainingVideoFps = getHighestImportedVideoFps({
			mediaAssets: editor.media.getAssets(),
		});
		if (
			highestRemainingVideoFps !== null &&
			highestRemainingVideoFps >= this.appliedProjectFps
		) {
			return;
		}

		new UpdateProjectSettingsCommand({ fps: this.previousProjectFps }).execute();
	}
}

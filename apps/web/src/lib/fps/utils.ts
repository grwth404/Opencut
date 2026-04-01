import type { MediaAsset } from "@/lib/media/types";

type MediaAssetFpsInput = Pick<MediaAsset, "type" | "fps">;

export function getHighestImportedVideoFps({
	mediaAssets,
}: {
	mediaAssets: MediaAssetFpsInput[];
}): number | null {
	let highestFps: number | null = null;

	for (const asset of mediaAssets) {
		const fps = asset.fps ?? Number.NaN;
		if (asset.type !== "video") continue;
		if (!Number.isFinite(fps) || fps <= 0) continue;

		highestFps = highestFps === null ? fps : Math.max(highestFps, fps);
	}

	return highestFps;
}

export function getRaisedProjectFpsForImportedMedia({
	currentFps,
	importedAssets,
}: {
	currentFps: number;
	importedAssets: MediaAssetFpsInput[];
}): number | null {
	const highestImportedVideoFps = getHighestImportedVideoFps({
		mediaAssets: importedAssets,
	});

	if (highestImportedVideoFps === null || highestImportedVideoFps <= currentFps) {
		return null;
	}

	return highestImportedVideoFps;
}

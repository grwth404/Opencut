import type { MigrationResult, ProjectRecord } from "./types";
import { VOLUME_DB_MIN } from "@/lib/timeline/audio-constants";
import { clampDb } from "@/lib/timeline/audio-state";
import { getProjectId, isRecord } from "./utils";

export function transformProjectV17ToV18({
	project,
}: {
	project: ProjectRecord;
}): MigrationResult<ProjectRecord> {
	if (!getProjectId({ project })) {
		return { project, skipped: true, reason: "no project id" };
	}

	if (typeof project.version === "number" && project.version >= 18) {
		return { project, skipped: true, reason: "already v18" };
	}

	return {
		project: {
			...migrateElementVolumes({ project }),
			version: 18,
		},
		skipped: false,
	};
}

function migrateElementVolumes({
	project,
}: {
	project: ProjectRecord;
}): ProjectRecord {
	const scenesValue = project.scenes;
	if (!Array.isArray(scenesValue)) {
		return project;
	}

	const migratedScenes = scenesValue.map((scene) => {
		if (!isRecord(scene)) {
			return scene;
		}

		const tracksValue = scene.tracks;
		if (!Array.isArray(tracksValue)) {
			return scene;
		}

		const migratedTracks = tracksValue.map((track) => {
			if (!isRecord(track)) {
				return track;
			}

			const elementsValue = track.elements;
			if (!Array.isArray(elementsValue)) {
				return track;
			}

			const migratedElements = elementsValue.map((element) => {
				if (!isRecord(element)) {
					return element;
				}

				if (element.type !== "audio" && element.type !== "video") {
					return element;
				}

				const legacyVolume = element.volume;
				return {
					...element,
					volume:
						typeof legacyVolume === "number"
							? linearGainToDb(legacyVolume)
							: 0,
				};
			});

			return {
				...track,
				elements: migratedElements,
			};
		});

		return {
			...scene,
			tracks: migratedTracks,
		};
	});

	return {
		...project,
		scenes: migratedScenes,
	};
}

function linearGainToDb(gain: number): number {
	if (!Number.isFinite(gain)) {
		return 0;
	}

	if (gain <= 0) {
		return VOLUME_DB_MIN;
	}

	return clampDb(20 * Math.log10(gain));
}

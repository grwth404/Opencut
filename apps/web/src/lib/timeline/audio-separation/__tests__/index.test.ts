import { describe, expect, test } from "bun:test";
import type { AudioElement, VideoElement } from "@/lib/timeline";
import {
	buildSeparatedAudioElement,
	doesElementHaveEnabledAudio,
	isSourceAudioEnabled,
	isSourceAudioSeparated,
} from "..";

describe("audio separation", () => {
	test("treats missing source audio state as enabled", () => {
		const element = buildVideoElement({});

		expect(isSourceAudioEnabled({ element })).toBe(true);
		expect(isSourceAudioSeparated({ element })).toBe(false);
	});

	test("builds a detached audio element from the source clip audio state", () => {
		const element = buildVideoElement({
			duration: 8,
			startTime: 3,
			trimStart: 1.5,
			trimEnd: 0.5,
			sourceDuration: 12,
			volume: -6,
			muted: true,
			retime: { rate: 1.25, maintainPitch: true },
			animations: {
				channels: {
					volume: {
						valueKind: "number",
						keyframes: [
							{
								id: "volume-keyframe",
								time: 2,
								value: -12,
								interpolation: "linear",
							},
						],
					},
					opacity: {
						valueKind: "number",
						keyframes: [
							{
								id: "opacity-keyframe",
								time: 1,
								value: 0.5,
								interpolation: "linear",
							},
						],
					},
				},
			},
		});

		const separatedAudioElement = buildSeparatedAudioElement({
			sourceElement: element,
		});

		expect(separatedAudioElement).toMatchObject({
			type: "audio",
			sourceType: "upload",
			mediaId: element.mediaId,
			name: element.name,
			duration: 8,
			startTime: 3,
			trimStart: 1.5,
			trimEnd: 0.5,
			sourceDuration: 12,
			volume: -6,
			muted: true,
			retime: { rate: 1.25, maintainPitch: true },
		});
		expect(Object.keys(separatedAudioElement.animations?.channels ?? {})).toEqual([
			"volume",
		]);
		expect(
			separatedAudioElement.animations?.channels.volume?.keyframes[0]?.id,
		).not.toBe("volume-keyframe");
	});

	test("skips source audio collection when the source clip is separated", () => {
		const mediaAsset = {
			id: "media-1",
			type: "video",
			name: "Clip",
			size: 1,
			lastModified: 1,
			file: new File(["video"], "clip.mp4", { type: "video/mp4" }),
			url: "blob:clip",
			hasAudio: true,
		};
		const videoElement = buildVideoElement({
			isSourceAudioEnabled: false,
		});
		const audioElement = {
			id: "audio-1",
			type: "audio",
			sourceType: "upload",
			mediaId: "audio-media-1",
			name: "Detached audio",
			duration: 5,
			startTime: 0,
			trimStart: 0,
			trimEnd: 0,
			volume: 0,
		} as AudioElement;

		expect(
			doesElementHaveEnabledAudio({
				element: videoElement,
				mediaAsset,
			}),
		).toBe(false);
		expect(
			doesElementHaveEnabledAudio({
				element: audioElement,
			}),
		).toBe(true);
	});
});

function buildVideoElement(
	overrides: Partial<VideoElement>,
): VideoElement {
	return {
		id: "video-1",
		type: "video",
		mediaId: "media-1",
		name: "Clip",
		duration: 5,
		startTime: 0,
		trimStart: 0,
		trimEnd: 0,
		volume: 0,
		muted: false,
		isSourceAudioEnabled: true,
		transform: {
			scaleX: 1,
			scaleY: 1,
			position: { x: 0, y: 0 },
			rotate: 0,
		},
		opacity: 1,
		...overrides,
	};
}

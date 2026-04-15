import { describe, expect, test } from "bun:test";
import type {
	AudioTrack,
	OverlayTrack,
	SceneTracks,
	TextElement,
	TextTrack,
	VideoElement,
	VideoTrack,
} from "@/lib/timeline/types";
import type { Transform } from "@/lib/rendering";
import { buildMoveGroup } from "@/lib/timeline/group-move/build-group";
import { resolveGroupMove } from "@/lib/timeline/group-move/resolve-move";

function buildTransform(): Transform {
	return {
		scaleX: 1,
		scaleY: 1,
		position: { x: 0, y: 0 },
		rotate: 0,
	};
}

function buildVideoElement({
	id,
	startTime,
	duration,
}: {
	id: string;
	startTime: number;
	duration: number;
}): VideoElement {
	return {
		id,
		type: "video",
		name: id,
		startTime,
		duration,
		trimStart: 0,
		trimEnd: 0,
		mediaId: `${id}-media`,
		transform: buildTransform(),
		opacity: 1,
	};
}

function buildTextElement({
	id,
	startTime,
	duration,
}: {
	id: string;
	startTime: number;
	duration: number;
}): TextElement {
	return {
		id,
		type: "text",
		name: id,
		startTime,
		duration,
		trimStart: 0,
		trimEnd: 0,
		content: id,
		fontSize: 32,
		fontFamily: "Inter",
		color: "#ffffff",
		background: {
			enabled: false,
			color: "#000000",
		},
		textAlign: "left",
		fontWeight: "normal",
		fontStyle: "normal",
		textDecoration: "none",
		transform: buildTransform(),
		opacity: 1,
	};
}

function buildVideoTrack({
	id,
	elements = [],
}: {
	id: string;
	elements?: VideoTrack["elements"];
}): VideoTrack {
	return {
		id,
		type: "video",
		name: id,
		elements,
		muted: false,
		hidden: false,
	};
}

function buildTextTrack({
	id,
	elements = [],
}: {
	id: string;
	elements?: TextTrack["elements"];
}): TextTrack {
	return {
		id,
		type: "text",
		name: id,
		elements,
		hidden: false,
	};
}

function buildTracks({
	overlay,
	main,
	audio = [],
}: {
	overlay: OverlayTrack[];
	main: VideoTrack;
	audio?: AudioTrack[];
}): SceneTracks {
	return {
		overlay,
		main,
		audio,
	};
}

describe("group move", () => {
	test("buildMoveGroup keeps rigid time offsets", () => {
		const tracks = buildTracks({
			overlay: [
				buildVideoTrack({
					id: "overlay-video",
					elements: [
						buildVideoElement({ id: "video-1", startTime: 5, duration: 4 }),
					],
				}),
				buildTextTrack({
					id: "overlay-text",
					elements: [
						buildTextElement({ id: "text-1", startTime: 8, duration: 3 }),
					],
				}),
			],
			main: buildVideoTrack({ id: "main" }),
		});

		const group = buildMoveGroup({
			anchorRef: { trackId: "overlay-video", elementId: "video-1" },
			selectedElements: [
				{ trackId: "overlay-video", elementId: "video-1" },
				{ trackId: "overlay-text", elementId: "text-1" },
			],
			tracks,
		});

		expect(group).not.toBeNull();
		expect(group?.members.map((member) => member.timeOffset)).toEqual([0, 3]);
	});

	test("resolveGroupMove preserves order and clamps rigidly at time zero", () => {
		const tracks = buildTracks({
			overlay: [
				buildTextTrack({
					id: "overlay-text",
					elements: [
						buildTextElement({ id: "text-1", startTime: 0, duration: 3 }),
					],
				}),
				buildVideoTrack({
					id: "overlay-video",
					elements: [
						buildVideoElement({ id: "video-1", startTime: 5, duration: 4 }),
					],
				}),
			],
			main: buildVideoTrack({ id: "main" }),
		});
		const group = buildMoveGroup({
			anchorRef: { trackId: "overlay-video", elementId: "video-1" },
			selectedElements: [
				{ trackId: "overlay-video", elementId: "video-1" },
				{ trackId: "overlay-text", elementId: "text-1" },
			],
			tracks,
		});
		if (!group) {
			throw new Error("Expected group");
		}

		const result = resolveGroupMove({
			group,
			tracks,
			anchorStartTime: 7,
			target: {
				kind: "existingTrack",
				anchorTargetTrackId: "main",
			},
		});

		expect(result?.moves).toEqual([
			{
				sourceTrackId: "overlay-video",
				elementId: "video-1",
				targetTrackId: "main",
				newStartTime: 5,
			},
			{
				sourceTrackId: "overlay-text",
				elementId: "text-1",
				targetTrackId: "overlay-text",
				newStartTime: 0,
			},
		]);
	});

	test("resolveGroupMove falls back to new overlay tracks when the group cannot cross main", () => {
		const tracks = buildTracks({
			overlay: [
				buildVideoTrack({
					id: "overlay-video",
					elements: [
						buildVideoElement({ id: "video-1", startTime: 5, duration: 4 }),
					],
				}),
				buildTextTrack({
					id: "overlay-text",
					elements: [
						buildTextElement({ id: "text-1", startTime: 5, duration: 3 }),
					],
				}),
			],
			main: buildVideoTrack({ id: "main" }),
		});
		const group = buildMoveGroup({
			anchorRef: { trackId: "overlay-video", elementId: "video-1" },
			selectedElements: [
				{ trackId: "overlay-video", elementId: "video-1" },
				{ trackId: "overlay-text", elementId: "text-1" },
			],
			tracks,
		});
		if (!group) {
			throw new Error("Expected group");
		}

		const result = resolveGroupMove({
			group,
			tracks,
			anchorStartTime: 6,
			target: {
				kind: "newTracks",
				anchorInsertIndex: 2,
				newTrackIds: ["new-video-track", "new-text-track"],
			},
		});

		expect(result?.createTracks).toEqual([
			{
				id: "new-video-track",
				type: "video",
				index: 2,
			},
			{
				id: "new-text-track",
				type: "text",
				index: 3,
			},
		]);
		expect(result?.moves).toEqual([
			{
				sourceTrackId: "overlay-video",
				elementId: "video-1",
				targetTrackId: "new-video-track",
				newStartTime: 6,
			},
			{
				sourceTrackId: "overlay-text",
				elementId: "text-1",
				targetTrackId: "new-text-track",
				newStartTime: 6,
			},
		]);
	});
});

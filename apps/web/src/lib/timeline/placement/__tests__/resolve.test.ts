import { describe, expect, test } from "bun:test";
import type {
	AudioElement,
	AudioTrack,
	GraphicElement,
	GraphicTrack,
	TextElement,
	TextTrack,
	TimelineTrack,
	VideoElement,
	VideoTrack,
} from "@/lib/timeline";
import type { Transform } from "@/lib/rendering";
import { resolveTrackPlacement } from "@/lib/timeline/placement";

function buildTransform(): Transform {
	return {
		scaleX: 1,
		scaleY: 1,
		position: { x: 0, y: 0 },
		rotate: 0,
	};
}

type TestElement = AudioElement | GraphicElement | TextElement | VideoElement;

function buildElement(params: {
	id: string;
	type: "audio";
	startTime: number;
	duration: number;
}): AudioElement;
function buildElement(params: {
	id: string;
	type: "graphic";
	startTime: number;
	duration: number;
}): GraphicElement;
function buildElement(params: {
	id: string;
	type: "text";
	startTime: number;
	duration: number;
}): TextElement;
function buildElement(params: {
	id: string;
	type: "video";
	startTime: number;
	duration: number;
}): VideoElement;
function buildElement({
	id,
	type,
	startTime,
	duration,
}: {
	id: string;
	type: TestElement["type"];
	startTime: number;
	duration: number;
}): TestElement {
	switch (type) {
		case "audio":
			return {
				id,
				type: "audio",
				name: id,
				startTime,
				duration,
				trimStart: 0,
				trimEnd: 0,
				volume: 1,
				sourceType: "upload",
				mediaId: `media-${id}`,
			} satisfies AudioElement;
		case "graphic":
			return {
				id,
				type: "graphic",
				name: id,
				startTime,
				duration,
				trimStart: 0,
				trimEnd: 0,
				definitionId: `graphic-${id}`,
				params: {},
				transform: buildTransform(),
				opacity: 1,
			} satisfies GraphicElement;
		case "text":
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
				fontFamily: "sans-serif",
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
			} satisfies TextElement;
		case "video":
			return {
				id,
				type: "video",
				name: id,
				startTime,
				duration,
				trimStart: 0,
				trimEnd: 0,
				mediaId: `media-${id}`,
				transform: buildTransform(),
				opacity: 1,
			} satisfies VideoElement;
	}

	throw new Error(`Unsupported test element type: ${type}`);
}

type BuildTrackParams =
	| {
			id: string;
			type: "audio";
			elements?: AudioTrack["elements"];
			isMain?: boolean;
	  }
	| {
			id: string;
			type: "graphic";
			elements?: GraphicTrack["elements"];
			isMain?: boolean;
	  }
	| {
			id: string;
			type: "text";
			elements?: TextTrack["elements"];
			isMain?: boolean;
	  }
	| {
			id: string;
			type: "video";
			elements?: VideoTrack["elements"];
			isMain?: boolean;
	  };

function buildTrack(params: {
	id: string;
	type: "audio";
	elements?: AudioTrack["elements"];
	isMain?: boolean;
}): AudioTrack;
function buildTrack(params: {
	id: string;
	type: "graphic";
	elements?: GraphicTrack["elements"];
	isMain?: boolean;
}): GraphicTrack;
function buildTrack(params: {
	id: string;
	type: "text";
	elements?: TextTrack["elements"];
	isMain?: boolean;
}): TextTrack;
function buildTrack(params: {
	id: string;
	type: "video";
	elements?: VideoTrack["elements"];
	isMain?: boolean;
}): VideoTrack;
function buildTrack(params: BuildTrackParams): TimelineTrack {
	const { id, type, isMain = false } = params;

	switch (type) {
		case "audio":
			return {
				id,
				type: "audio",
				name: id,
				elements: params.elements ?? [],
				muted: false,
			};
		case "graphic":
			return {
				id,
				type: "graphic",
				name: id,
				elements: params.elements ?? [],
				hidden: false,
			};
		case "text":
			return {
				id,
				type: "text",
				name: id,
				elements: params.elements ?? [],
				hidden: false,
			};
		case "video":
			return {
				id,
				type: "video",
				name: id,
				elements: params.elements ?? [],
				isMain,
				muted: false,
				hidden: false,
			};
	}

	throw new Error(`Unsupported test track type: ${type}`);
}

function buildTimeSpan({
	startTime,
	duration,
	excludeElementId,
}: {
	startTime: number;
	duration: number;
	excludeElementId?: string;
}) {
	return { startTime, duration, excludeElementId };
}

describe("resolveTrackPlacement", () => {
	test("explicit returns the requested compatible track", () => {
		const tracks = [buildTrack({ id: "text-1", type: "text" })];

		expect(
			resolveTrackPlacement({
				tracks,
				elementType: "text",
				timeSpans: [buildTimeSpan({ startTime: 2, duration: 3 })],
				strategy: { type: "explicit", trackId: "text-1" },
			}),
		).toEqual({
			kind: "existingTrack",
			trackId: "text-1",
			trackIndex: 0,
			trackType: "text",
		});
	});

	test("explicit rejects missing and incompatible tracks", () => {
		const tracks = [buildTrack({ id: "video-1", type: "video", isMain: true })];

		expect(
			resolveTrackPlacement({
				tracks,
				elementType: "text",
				timeSpans: [buildTimeSpan({ startTime: 0, duration: 1 })],
				strategy: { type: "explicit", trackId: "missing" },
			}),
		).toBeNull();

		expect(
			resolveTrackPlacement({
				tracks,
				elementType: "text",
				timeSpans: [buildTimeSpan({ startTime: 0, duration: 1 })],
				strategy: { type: "explicit", trackId: "video-1" },
			}),
		).toBeNull();
	});

	test("firstAvailable picks the first compatible track without overlap", () => {
		const tracks = [
			buildTrack({
				id: "text-1",
				type: "text",
				elements: [
					buildElement({ id: "a", type: "text", startTime: 0, duration: 5 }),
				],
			}),
			buildTrack({ id: "text-2", type: "text" }),
		];

		expect(
			resolveTrackPlacement({
				tracks,
				elementType: "text",
				timeSpans: [buildTimeSpan({ startTime: 2, duration: 1 })],
				strategy: { type: "firstAvailable" },
			}),
		).toEqual({
			kind: "existingTrack",
			trackId: "text-2",
			trackIndex: 1,
			trackType: "text",
		});
	});

	test("firstAvailable creates a new track when all compatible tracks are full", () => {
		const tracks = [
			buildTrack({
				id: "graphic-1",
				type: "graphic",
				elements: [
					buildElement({ id: "a", type: "graphic", startTime: 0, duration: 5 }),
				],
			}),
			buildTrack({
				id: "video-main",
				type: "video",
				isMain: true,
			}),
			buildTrack({ id: "audio-1", type: "audio" }),
		];

		expect(
			resolveTrackPlacement({
				tracks,
				elementType: "graphic",
				timeSpans: [buildTimeSpan({ startTime: 1, duration: 1 })],
				strategy: { type: "firstAvailable" },
			}),
		).toEqual({
			kind: "newTrack",
			trackType: "graphic",
			insertIndex: 1,
			insertPosition: null,
		});
	});

	test("preferIndex uses the preferred track when it fits", () => {
		const tracks = [buildTrack({ id: "audio-1", type: "audio" })];

		expect(
			resolveTrackPlacement({
				tracks,
				elementType: "audio",
				timeSpans: [buildTimeSpan({ startTime: 3, duration: 2 })],
				strategy: {
					type: "preferIndex",
					trackIndex: 0,
					hoverDirection: "below",
				},
			}),
		).toEqual({
			kind: "existingTrack",
			trackId: "audio-1",
			trackIndex: 0,
			trackType: "audio",
		});
	});

	test("preferIndex creates a new overlay track above the main track", () => {
		const tracks = [
			buildTrack({ id: "video-main", type: "video", isMain: true }),
			buildTrack({ id: "audio-1", type: "audio" }),
		];

		expect(
			resolveTrackPlacement({
				tracks,
				elementType: "graphic",
				timeSpans: [buildTimeSpan({ startTime: 1, duration: 2 })],
				strategy: {
					type: "preferIndex",
					trackIndex: 1,
					hoverDirection: "below",
				},
			}),
		).toEqual({
			kind: "newTrack",
			trackType: "graphic",
			insertIndex: 0,
			insertPosition: "above",
		});
	});

	test("preferIndex keeps audio tracks below the main track", () => {
		const tracks = [
			buildTrack({ id: "text-1", type: "text" }),
			buildTrack({ id: "video-main", type: "video", isMain: true }),
			buildTrack({ id: "audio-1", type: "audio" }),
		];

		expect(
			resolveTrackPlacement({
				tracks,
				elementType: "audio",
				timeSpans: [buildTimeSpan({ startTime: 0, duration: 1 })],
				strategy: {
					type: "preferIndex",
					trackIndex: 0,
					hoverDirection: "above",
					createNewTrackOnly: true,
				},
			}),
		).toEqual({
			kind: "newTrack",
			trackType: "audio",
			insertIndex: 2,
			insertPosition: "below",
		});
	});

	test("aboveSource tries the track above source, then any compatible track", () => {
		const tracks = [
			buildTrack({ id: "text-top", type: "text" }),
			buildTrack({
				id: "text-middle",
				type: "text",
				elements: [
					buildElement({ id: "a", type: "text", startTime: 0, duration: 5 }),
				],
			}),
			buildTrack({ id: "text-source", type: "text" }),
		];

		expect(
			resolveTrackPlacement({
				tracks,
				elementType: "text",
				timeSpans: [buildTimeSpan({ startTime: 1, duration: 1 })],
				strategy: { type: "aboveSource", sourceTrackIndex: 2 },
			}),
		).toEqual({
			kind: "existingTrack",
			trackId: "text-top",
			trackIndex: 0,
			trackType: "text",
		});
	});

	test("aboveSource creates a new track near the source when none fit", () => {
		const tracks = [
			buildTrack({
				id: "text-top",
				type: "text",
				elements: [
					buildElement({ id: "a", type: "text", startTime: 0, duration: 5 }),
				],
			}),
			buildTrack({
				id: "text-source",
				type: "text",
				elements: [
					buildElement({ id: "b", type: "text", startTime: 0, duration: 5 }),
				],
			}),
		];

		expect(
			resolveTrackPlacement({
				tracks,
				elementType: "text",
				timeSpans: [buildTimeSpan({ startTime: 1, duration: 1 })],
				strategy: { type: "aboveSource", sourceTrackIndex: 1 },
			}),
		).toEqual({
			kind: "newTrack",
			trackType: "text",
			insertIndex: 1,
			insertPosition: null,
		});
	});

	test("alwaysNew honors highest and default insertion rules", () => {
		const tracks = [
			buildTrack({ id: "video-main", type: "video", isMain: true }),
			buildTrack({ id: "audio-1", type: "audio" }),
		];

		expect(
			resolveTrackPlacement({
				tracks,
				elementType: "audio",
				timeSpans: [],
				strategy: { type: "alwaysNew", position: "highest" },
			}),
		).toEqual({
			kind: "newTrack",
			trackType: "audio",
			insertIndex: 1,
			insertPosition: null,
		});

		expect(
			resolveTrackPlacement({
				tracks,
				elementType: "audio",
				timeSpans: [],
				strategy: { type: "alwaysNew", position: "default" },
			}),
		).toEqual({
			kind: "newTrack",
			trackType: "audio",
			insertIndex: 2,
			insertPosition: null,
		});
	});

	test("batch time spans reject tracks when any span overlaps", () => {
		const tracks = [
			buildTrack({
				id: "audio-1",
				type: "audio",
				elements: [
					buildElement({ id: "a", type: "audio", startTime: 0, duration: 2 }),
					buildElement({ id: "b", type: "audio", startTime: 5, duration: 2 }),
				],
			}),
		];

		expect(
			resolveTrackPlacement({
				tracks,
				elementType: "audio",
				timeSpans: [
					buildTimeSpan({ startTime: 2.5, duration: 1 }),
					buildTimeSpan({ startTime: 5.5, duration: 1 }),
				],
				strategy: { type: "firstAvailable" },
			}),
		).toEqual({
			kind: "newTrack",
			trackType: "audio",
			insertIndex: 1,
			insertPosition: null,
		});
	});

	test("handles empty timelines, single tracks, and track-type derivation", () => {
		expect(
			resolveTrackPlacement({
				tracks: [],
				elementType: "video",
				timeSpans: [buildTimeSpan({ startTime: 0, duration: 3 })],
				strategy: {
					type: "preferIndex",
					trackIndex: 0,
					hoverDirection: "below",
					createNewTrackOnly: true,
				},
			}),
		).toEqual({
			kind: "newTrack",
			trackType: "video",
			insertIndex: 0,
			insertPosition: null,
		});

		expect(
			resolveTrackPlacement({
				tracks: [buildTrack({ id: "audio-1", type: "audio" })],
				elementType: "audio",
				timeSpans: [],
				strategy: { type: "alwaysNew", position: "default" },
			}),
		).toEqual({
			kind: "newTrack",
			trackType: "audio",
			insertIndex: 1,
			insertPosition: null,
		});
	});

	test("existingTrack on main video includes adjustedStartTime when start snaps", () => {
		const tracks = [
			buildTrack({
				id: "video-main",
				type: "video",
				isMain: true,
				elements: [
					buildElement({ id: "a", type: "video", startTime: 5, duration: 5 }),
				],
			}),
		];

		expect(
			resolveTrackPlacement({
				tracks,
				elementType: "video",
				timeSpans: [buildTimeSpan({ startTime: 2, duration: 2 })],
				strategy: { type: "explicit", trackId: "video-main" },
			}),
		).toEqual({
			kind: "existingTrack",
			trackId: "video-main",
			trackIndex: 0,
			trackType: "video",
			adjustedStartTime: 0,
		});
	});

	test("preferIndex uses vertical drag direction when hovered track is incompatible", () => {
		const tracks = [
			buildTrack({ id: "text-1", type: "text" }),
			buildTrack({ id: "video-main", type: "video", isMain: true }),
			buildTrack({ id: "audio-1", type: "audio" }),
		];

		expect(
			resolveTrackPlacement({
				tracks,
				elementType: "audio",
				timeSpans: [buildTimeSpan({ startTime: 0, duration: 1 })],
				strategy: {
					type: "preferIndex",
					trackIndex: 0,
					hoverDirection: "above",
					verticalDragDirection: "down",
				},
			}),
		).toEqual({
			kind: "newTrack",
			trackType: "audio",
			insertIndex: 2,
			insertPosition: "below",
		});
	});
});

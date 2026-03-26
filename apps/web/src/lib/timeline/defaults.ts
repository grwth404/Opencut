import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import type { TTimelineViewState } from "@/lib/project/types";
import type { BlendMode, Transform } from "@/lib/rendering";
import type { TextElement } from "./types";

const defaultTransform: Transform = {
	scaleX: 1,
	scaleY: 1,
	position: { x: 0, y: 0 },
	rotate: 0,
};

const defaultOpacity = 1;
const defaultBlendMode: BlendMode = "normal";
const defaultVolume = 0;

const defaultTextLetterSpacing = 0;
const defaultTextLineHeight = 1.2;

const defaultTextBackground = {
	enabled: false,
	color: "#000000",
	cornerRadius: 0,
	paddingX: 30,
	paddingY: 42,
	offsetX: 0,
	offsetY: 0,
};

const defaultTextElement: Omit<TextElement, "id"> = {
	type: "text",
	name: "Text",
	content: "Default text",
	fontSize: 15,
	fontFamily: "Arial",
	color: "#ffffff",
	background: { ...defaultTextBackground },
	textAlign: "center",
	fontWeight: "normal",
	fontStyle: "normal",
	textDecoration: "none",
	letterSpacing: defaultTextLetterSpacing,
	lineHeight: defaultTextLineHeight,
	duration: TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION,
	startTime: 0,
	trimStart: 0,
	trimEnd: 0,
	transform: {
		...defaultTransform,
		position: { ...defaultTransform.position },
	},
	opacity: defaultOpacity,
};

const defaultTimelineViewState: TTimelineViewState = {
	zoomLevel: 1,
	scrollLeft: 0,
	playheadTime: 0,
};

export const DEFAULTS = {
	element: {
		transform: defaultTransform,
		opacity: defaultOpacity,
		blendMode: defaultBlendMode,
		volume: defaultVolume,
	},
	text: {
		letterSpacing: defaultTextLetterSpacing,
		lineHeight: defaultTextLineHeight,
		background: defaultTextBackground,
		element: defaultTextElement,
	},
	timeline: {
		viewState: defaultTimelineViewState,
	},
};

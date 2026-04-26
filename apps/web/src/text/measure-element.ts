import { CORNER_RADIUS_MIN } from "@/text/background";
import { DEFAULTS } from "@/timeline/defaults";
import type { TextBackground, TextElement } from "@/timeline";
import { resolveNumberAtTime } from "@/animation/values";
import {
	getTextVisualRect,
} from "./layout";
import {
	measureTextLayout,
	type MeasuredTextLayout,
} from "./primitives";

export interface ResolvedTextBackground extends TextBackground {
	paddingX: number;
	paddingY: number;
	offsetX: number;
	offsetY: number;
	cornerRadius: number;
}

export interface MeasuredTextElement extends MeasuredTextLayout {
	resolvedBackground: ResolvedTextBackground;
	visualRect: { left: number; top: number; width: number; height: number };
}

let textMeasurementContext:
	| CanvasRenderingContext2D
	| OffscreenCanvasRenderingContext2D
	| null = null;

export function getTextMeasurementContext():
	| CanvasRenderingContext2D
	| OffscreenCanvasRenderingContext2D {
	if (textMeasurementContext) {
		return textMeasurementContext;
	}

	if (typeof OffscreenCanvas !== "undefined") {
		const canvas = new OffscreenCanvas(1, 1);
		const context = canvas.getContext("2d");
		if (context) {
			textMeasurementContext = context;
			return context;
		}
	}

	if (typeof document !== "undefined") {
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d");
		if (context) {
			textMeasurementContext = context;
			return context;
		}
	}

	throw new Error("Failed to create text measurement context");
}

export function measureTextElement({
	element,
	canvasHeight,
	localTime,
	ctx,
}: {
	element: TextElement;
	canvasHeight: number;
	localTime: number;
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}): MeasuredTextElement {
	const measuredLayout = measureTextLayout({
		text: {
			content: element.content,
			fontSize: element.fontSize,
			fontFamily: element.fontFamily,
			fontWeight: element.fontWeight,
			fontStyle: element.fontStyle,
			textAlign: element.textAlign,
			textDecoration: element.textDecoration,
			letterSpacing: element.letterSpacing,
			lineHeight: element.lineHeight,
		},
		canvasHeight,
		ctx,
	});

	const bg = element.background;
	const resolvedBackground: ResolvedTextBackground = {
		...bg,
		paddingX: resolveNumberAtTime({
			baseValue: bg.paddingX ?? DEFAULTS.text.background.paddingX,
			animations: element.animations,
			propertyPath: "background.paddingX",
			localTime,
		}),
		paddingY: resolveNumberAtTime({
			baseValue: bg.paddingY ?? DEFAULTS.text.background.paddingY,
			animations: element.animations,
			propertyPath: "background.paddingY",
			localTime,
		}),
		offsetX: resolveNumberAtTime({
			baseValue: bg.offsetX ?? DEFAULTS.text.background.offsetX,
			animations: element.animations,
			propertyPath: "background.offsetX",
			localTime,
		}),
		offsetY: resolveNumberAtTime({
			baseValue: bg.offsetY ?? DEFAULTS.text.background.offsetY,
			animations: element.animations,
			propertyPath: "background.offsetY",
			localTime,
		}),
		cornerRadius: resolveNumberAtTime({
			baseValue: bg.cornerRadius ?? CORNER_RADIUS_MIN,
			animations: element.animations,
			propertyPath: "background.cornerRadius",
			localTime,
		}),
	};

	const visualRect = getTextVisualRect({
		textAlign: element.textAlign,
		block: measuredLayout.block,
		background: resolvedBackground,
		fontSizeRatio: measuredLayout.fontSizeRatio,
	});

	return {
		...measuredLayout,
		resolvedBackground,
		visualRect,
	};
}

import {
	CORNER_RADIUS_MIN,
	FONT_SIZE_SCALE_REFERENCE,
} from "@/constants/text-constants";
import { resolveNumberAtTime } from "@/lib/animation";
import { DEFAULTS } from "@/lib/timeline/defaults";
import type { TextBackground, TextElement } from "@/lib/timeline";
import {
	measureTextBlock,
	setCanvasLetterSpacing,
	getTextVisualRect,
	type TextBlockMeasurement,
} from "./layout";

export interface ResolvedTextBackground extends TextBackground {
	paddingX: number;
	paddingY: number;
	offsetX: number;
	offsetY: number;
	cornerRadius: number;
}

export interface MeasuredTextElement {
	scaledFontSize: number;
	fontString: string;
	letterSpacing: number;
	lineHeightPx: number;
	lines: string[];
	lineMetrics: TextMetrics[];
	block: TextBlockMeasurement;
	fontSizeRatio: number;
	resolvedBackground: ResolvedTextBackground;
	visualRect: { left: number; top: number; width: number; height: number };
}

/**
 * Shared text measurement used by both the renderer and preview bounds.
 * Accepts the canvas context to measure on so callers can reuse an existing
 * context (e.g. the renderer's) rather than creating a throwaway canvas.
 * The context state is preserved via save/restore.
 */
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
	const scaledFontSize =
		element.fontSize * (canvasHeight / FONT_SIZE_SCALE_REFERENCE);
	const fontWeight = element.fontWeight === "bold" ? "bold" : "normal";
	const fontStyle = element.fontStyle === "italic" ? "italic" : "normal";
	const fontFamily = `"${element.fontFamily.replace(/"/g, '\\"')}"`;
	const fontString = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${fontFamily}, sans-serif`;
	const letterSpacing = element.letterSpacing ?? 0;
	const lineHeightPx =
		scaledFontSize * (element.lineHeight ?? DEFAULTS.text.lineHeight);
	const fontSizeRatio = element.fontSize / DEFAULTS.text.element.fontSize;
	const lines = element.content.split("\n");

	ctx.save();
	ctx.font = fontString;
	ctx.textBaseline = "middle";
	setCanvasLetterSpacing({ ctx, letterSpacingPx: letterSpacing });
	const lineMetrics = lines.map((line) => ctx.measureText(line));
	ctx.restore();

	const block = measureTextBlock({
		lineMetrics,
		lineHeightPx,
		fallbackFontSize: scaledFontSize,
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
		block,
		background: resolvedBackground,
		fontSizeRatio,
	});

	return {
		scaledFontSize,
		fontString,
		letterSpacing,
		lineHeightPx,
		lines,
		lineMetrics,
		block,
		fontSizeRatio,
		resolvedBackground,
		visualRect,
	};
}

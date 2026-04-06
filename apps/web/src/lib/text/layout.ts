import type { TextBackground, TextElement } from "@/lib/timeline";
import { DEFAULTS } from "@/lib/timeline/defaults";

type TextRect = {
	left: number;
	top: number;
	width: number;
	height: number;
};

export interface TextBlockMeasurement {
	visualCenterOffset: number;
	height: number;
	maxWidth: number;
}

type CanvasContext =
	| CanvasRenderingContext2D
	| OffscreenCanvasRenderingContext2D;

export function setCanvasLetterSpacing({
	ctx,
	letterSpacingPx,
}: {
	ctx: CanvasContext;
	letterSpacingPx: number;
}): void {
	if ("letterSpacing" in ctx) {
		(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
			`${letterSpacingPx}px`;
	}
}

export function getMetricAscent({
	metrics,
	fallbackFontSize,
}: {
	metrics: TextMetrics;
	fallbackFontSize: number;
}): number {
	return metrics.actualBoundingBoxAscent ?? fallbackFontSize * 0.8;
}

export function getMetricDescent({
	metrics,
	fallbackFontSize,
}: {
	metrics: TextMetrics;
	fallbackFontSize: number;
}): number {
	return metrics.actualBoundingBoxDescent ?? fallbackFontSize * 0.2;
}

export function measureTextBlock({
	lineMetrics,
	lineHeightPx,
}: {
	lineMetrics: TextMetrics[];
	lineHeightPx: number;
}): TextBlockMeasurement {
	let maxWidth = 0;

	for (const metrics of lineMetrics) {
		maxWidth = Math.max(maxWidth, metrics.width);
	}

	const lineCount = lineMetrics.length;
	const height = lineCount * lineHeightPx;
	const visualCenterOffset = ((lineCount - 1) * lineHeightPx) / 2;

	return { visualCenterOffset, height, maxWidth };
}

function getTextRect({
	textAlign,
	block,
}: {
	textAlign: TextElement["textAlign"];
	block: TextBlockMeasurement;
}): TextRect {
	const textAlignToLeft: Record<typeof textAlign, number> = {
		left: 0,
		right: -block.maxWidth,
		center: -block.maxWidth / 2,
	};
	const left = textAlignToLeft[textAlign];

	return {
		left,
		top: -block.height / 2,
		width: block.maxWidth,
		height: block.height,
	};
}

function isTextBackgroundVisible({
	background,
}: {
	background: TextBackground;
}): boolean {
	return (
		background.enabled &&
		Boolean(background.color) &&
		background.color !== "transparent"
	);
}

export function getTextBackgroundRect({
	textAlign,
	block,
	background,
	fontSizeRatio = 1,
}: {
	textAlign: TextElement["textAlign"];
	block: TextBlockMeasurement;
	background: TextBackground;
	fontSizeRatio?: number;
}): TextRect | null {
	if (!isTextBackgroundVisible({ background })) {
		return null;
	}

	const textRect = getTextRect({ textAlign, block });
	const paddingX =
		(background.paddingX ?? DEFAULTS.text.background.paddingX) * fontSizeRatio;
	const paddingY =
		(background.paddingY ?? DEFAULTS.text.background.paddingY) * fontSizeRatio;
	const offsetX = background.offsetX ?? DEFAULTS.text.background.offsetX;
	const offsetY = background.offsetY ?? DEFAULTS.text.background.offsetY;

	return {
		left: textRect.left - paddingX + offsetX,
		top: textRect.top - paddingY + offsetY,
		width: textRect.width + paddingX * 2,
		height: textRect.height + paddingY * 2,
	};
}

export function getTextVisualRect({
	textAlign,
	block,
	background,
	fontSizeRatio = 1,
}: {
	textAlign: TextElement["textAlign"];
	block: TextBlockMeasurement;
	background: TextBackground;
	fontSizeRatio?: number;
}): TextRect {
	const textRect = getTextRect({ textAlign, block });
	const backgroundRect = getTextBackgroundRect({
		textAlign,
		block,
		background,
		fontSizeRatio,
	});

	if (!backgroundRect) {
		return textRect;
	}

	const left = Math.min(textRect.left, backgroundRect.left);
	const top = Math.min(textRect.top, backgroundRect.top);
	const right = Math.max(
		textRect.left + textRect.width,
		backgroundRect.left + backgroundRect.width,
	);
	const bottom = Math.max(
		textRect.top + textRect.height,
		backgroundRect.top + backgroundRect.height,
	);

	return {
		left,
		top,
		width: right - left,
		height: bottom - top,
	};
}

import { BaseNode } from "./base-node";
import type { TextElement } from "@/lib/timeline";
import type { EffectPass } from "@/lib/effects/types";
import type { Transform } from "@/lib/rendering";
import {
	CORNER_RADIUS_MAX,
	CORNER_RADIUS_MIN,
} from "@/lib/text/background";
import {
	drawTextDecoration,
	getTextBackgroundRect,
	setCanvasLetterSpacing,
} from "@/lib/text/layout";
import type { MeasuredTextElement } from "@/lib/text/measure-element";
import { clamp } from "@/utils/math";

export type TextNodeParams = TextElement & {
	canvasCenter: { x: number; y: number };
	canvasHeight: number;
	textBaseline?: CanvasTextBaseline;
};

export interface ResolvedTextNodeState {
	transform: Transform;
	opacity: number;
	textColor: string;
	backgroundColor: string;
	effectPasses: EffectPass[][];
	measuredText: MeasuredTextElement;
}

export class TextNode extends BaseNode<TextNodeParams, ResolvedTextNodeState> {}

export function renderTextToContext({
	node,
	ctx,
}: {
	node: TextNode;
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}): void {
	const resolved = node.resolved;
	if (!resolved) {
		return;
	}

	const x = resolved.transform.position.x + node.params.canvasCenter.x;
	const y = resolved.transform.position.y + node.params.canvasCenter.y;
	const baseline = node.params.textBaseline ?? "middle";
	const {
		scaledFontSize,
		fontString,
		letterSpacing,
		lineHeightPx,
		lines,
		lineMetrics,
		block,
		fontSizeRatio,
		resolvedBackground,
	} = resolved.measuredText;
	const lineCount = lines.length;
	const resolvedBackgroundWithColor = {
		...resolvedBackground,
		color: resolved.backgroundColor,
	};

	ctx.save();
	ctx.translate(x, y);
	ctx.scale(resolved.transform.scaleX, resolved.transform.scaleY);
	if (resolved.transform.rotate) {
		ctx.rotate((resolved.transform.rotate * Math.PI) / 180);
	}

	ctx.font = fontString;
	ctx.textAlign = node.params.textAlign;
	ctx.textBaseline = baseline;
	ctx.fillStyle = resolved.textColor;
	setCanvasLetterSpacing({ ctx, letterSpacingPx: letterSpacing });

	if (
		node.params.background.enabled &&
		node.params.background.color &&
		node.params.background.color !== "transparent" &&
		lineCount > 0
	) {
		const backgroundRect = getTextBackgroundRect({
			textAlign: node.params.textAlign,
			block,
			background: resolvedBackgroundWithColor,
			fontSizeRatio,
		});
		if (backgroundRect) {
			const p =
				clamp({
					value: resolvedBackgroundWithColor.cornerRadius,
					min: CORNER_RADIUS_MIN,
					max: CORNER_RADIUS_MAX,
				}) / 100;
			const radius =
				(Math.min(backgroundRect.width, backgroundRect.height) / 2) * p;
			ctx.fillStyle = resolvedBackgroundWithColor.color;
			ctx.beginPath();
			ctx.roundRect(
				backgroundRect.left,
				backgroundRect.top,
				backgroundRect.width,
				backgroundRect.height,
				radius,
			);
			ctx.fill();
			ctx.fillStyle = resolved.textColor;
		}
	}

	for (let index = 0; index < lineCount; index++) {
		const lineY = index * lineHeightPx - block.visualCenterOffset;
		ctx.fillText(lines[index], 0, lineY);
		drawTextDecoration({
			ctx,
			textDecoration: node.params.textDecoration ?? "none",
			lineWidth: lineMetrics[index].width,
			lineY,
			metrics: lineMetrics[index],
			scaledFontSize,
			textAlign: node.params.textAlign,
		});
	}

	ctx.restore();
}

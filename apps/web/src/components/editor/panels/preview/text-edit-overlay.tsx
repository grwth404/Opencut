"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePreviewViewport } from "@/components/editor/panels/preview/preview-viewport";
import { useEditor } from "@/hooks/use-editor";
import type { TextElement } from "@/lib/timeline";
import {
	FONT_SIZE_SCALE_REFERENCE,
} from "@/constants/text-constants";
import { DEFAULTS } from "@/lib/timeline/defaults";
import {
	getMetricAscent,
	getMetricDescent,
	setCanvasLetterSpacing,
} from "@/lib/text/layout";

let cachedCanvas: HTMLCanvasElement | null = null;

function getMeasurementContext(): CanvasRenderingContext2D | null {
	if (!cachedCanvas) cachedCanvas = document.createElement("canvas");
	return cachedCanvas.getContext("2d");
}

/**
 * Uses fontBoundingBox metrics (which CSS uses for line box layout) rather than
 * actualBoundingBox to model where the browser places the baseline within the
 * line box, then measures actual glyph bounds to find the visual center.
 */
function measureCSSVisualCenterOffset({
	lines,
	fontString,
	letterSpacingPx,
	lineHeightPx,
	displayFontSize,
}: {
	lines: string[];
	fontString: string;
	letterSpacingPx: number;
	lineHeightPx: number;
	displayFontSize: number;
}): number {
	const ctx = getMeasurementContext();
	if (!ctx) return 0;

	ctx.font = fontString;
	ctx.textBaseline = "alphabetic";
	setCanvasLetterSpacing({ ctx, letterSpacingPx });

	const probe = ctx.measureText("M");
	const fontAscent = probe.fontBoundingBoxAscent ?? displayFontSize * 0.8;
	const fontDescent = probe.fontBoundingBoxDescent ?? displayFontSize * 0.2;
	const halfLeading = (lineHeightPx - fontAscent - fontDescent) / 2;

	let visualTop = Number.POSITIVE_INFINITY;
	let visualBottom = Number.NEGATIVE_INFINITY;

	for (let i = 0; i < lines.length; i++) {
		const metrics = ctx.measureText(lines[i] || " ");
		const baseline = i * lineHeightPx + halfLeading + fontAscent;
		visualTop = Math.min(
			visualTop,
			baseline - getMetricAscent({ metrics, fallbackFontSize: displayFontSize }),
		);
		visualBottom = Math.max(
			visualBottom,
			baseline + getMetricDescent({ metrics, fallbackFontSize: displayFontSize }),
		);
	}

	const cssBlockHeight = lines.length * lineHeightPx;
	return (visualTop + visualBottom) / 2 - cssBlockHeight / 2;
}

export function TextEditOverlay({
	trackId,
	elementId,
	element,
	onCommit,
}: {
	trackId: string;
	elementId: string;
	element: TextElement;
	onCommit: () => void;
}) {
	const editor = useEditor();
	const viewport = usePreviewViewport();
	const divRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const div = divRef.current;
		if (!div) return;
		div.focus();
		const range = document.createRange();
		range.selectNodeContents(div);
		const selection = window.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(range);
	}, []);

	const handleInput = useCallback(() => {
		const div = divRef.current;
		if (!div) return;
		const text = div.innerText;
		editor.timeline.previewElements({
			updates: [{ trackId, elementId, updates: { content: text } }],
		});
	}, [editor.timeline, trackId, elementId]);

	const handleKeyDown = useCallback(
		({ event }: { event: React.KeyboardEvent }) => {
			const { key } = event;
			if (key === "Escape") {
				event.preventDefault();
				onCommit();
				return;
			}
		},
		[onCommit],
	);

	const canvasSize = editor.project.getActive().settings.canvasSize;

	if (!canvasSize) return null;

	const { x: posX, y: posY } = viewport.positionToOverlay({
		positionX: element.transform.position.x,
		positionY: element.transform.position.y,
	});

	const { x: displayScaleX } = viewport.getDisplayScale();

	const displayFontSize =
		element.fontSize *
		(canvasSize.height / FONT_SIZE_SCALE_REFERENCE) *
		displayScaleX;

	const lineHeight = element.lineHeight ?? DEFAULTS.text.lineHeight;
	const fontWeight = element.fontWeight === "bold" ? "bold" : "normal";
	const fontStyle = element.fontStyle === "italic" ? "italic" : "normal";
	const displayLetterSpacing = (element.letterSpacing ?? 0) * displayScaleX;
	const lineHeightPx = displayFontSize * lineHeight;
	const lines = (element.content || "").split("\n");
	const fontString = `${fontStyle} ${fontWeight} ${displayFontSize}px "${element.fontFamily}", sans-serif`;

	const cssVisualCenterOffset = measureCSSVisualCenterOffset({
		lines,
		fontString,
		letterSpacingPx: displayLetterSpacing,
		lineHeightPx,
		displayFontSize,
	});

	const bg = element.background;
	const shouldShowBackground =
		bg.enabled && bg.color && bg.color !== "transparent";
	const fontSizeRatio = element.fontSize / DEFAULTS.text.element.fontSize;
	const displayPaddingX = shouldShowBackground
		? (bg.paddingX ?? DEFAULTS.text.background.paddingX) *
			fontSizeRatio *
			displayScaleX
		: 0;
	const displayPaddingY = shouldShowBackground
		? (bg.paddingY ?? DEFAULTS.text.background.paddingY) *
			fontSizeRatio *
			displayScaleX
		: 0;

	return (
		<div
			className="absolute"
			style={{
				left: posX,
				top: posY - cssVisualCenterOffset,
				transform: `translate(-50%, -50%) scale(${element.transform.scaleX}, ${element.transform.scaleY}) rotate(${element.transform.rotate}deg)`,
				transformOrigin: "center center",
			}}
		>
			{/* biome-ignore lint/a11y/useSemanticElements: contenteditable required for multiline, IME, paste */}
			<div
				ref={divRef}
				contentEditable
				suppressContentEditableWarning
				tabIndex={0}
				role="textbox"
				aria-label="Edit text"
				className="cursor-text select-text outline-none whitespace-pre"
				style={{
					fontSize: displayFontSize,
					fontFamily: element.fontFamily,
					fontWeight,
					fontStyle,
					textAlign: element.textAlign,
					letterSpacing: `${displayLetterSpacing}px`,
					lineHeight,
					color: element.color,
					backgroundColor: shouldShowBackground ? bg.color : "transparent",
					minHeight: lineHeightPx,
					textDecoration: element.textDecoration ?? "none",
					padding: shouldShowBackground
						? `${displayPaddingY}px ${displayPaddingX}px`
						: 0,
					minWidth: 1,
				}}
				onInput={handleInput}
				onBlur={onCommit}
				onKeyDown={(event) => handleKeyDown({ event })}
			>
				{element.content || ""}
			</div>
		</div>
	);
}

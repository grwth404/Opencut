"use client";

import { useCallback, useEffect, useRef } from "react";
import { useResizeObserver } from "@/hooks/use-resize-observer";
import { computeGlobalMaxRms, extractRmsRange } from "@/lib/media/audio";
import { findScrollParent } from "@/utils/browser";
import { cn } from "@/utils/ui";

const BAR_WIDTH = 2;
const BAR_GAP = 1;
const BAR_STEP = BAR_WIDTH + BAR_GAP;
interface AudioWaveformProps {
	audioUrl?: string;
	audioBuffer?: AudioBuffer;
	color?: string;
	className?: string;
}

export function AudioWaveform({
	audioUrl,
	audioBuffer,
	color = "rgba(255, 255, 255, 0.7)",
	className = "",
}: AudioWaveformProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const bufferRef = useRef<AudioBuffer | null>(null);
	const globalMaxRef = useRef<number>(1);
	const scrollParentRef = useRef<HTMLElement | null>(null);
	const heightRef = useRef<number>(0);

	const drawVisible = useCallback(() => {
		const container = containerRef.current;
		const canvas = canvasRef.current;
		const buffer = bufferRef.current;
		const height = heightRef.current;

		if (!container || !canvas || !buffer || height <= 0) return;

		const elementWidth = container.offsetWidth;
		if (elementWidth <= 0) return;

		const containerRect = container.getBoundingClientRect();
		const scrollParent = scrollParentRef.current;

		let clipLeft: number;
		let clipRight: number;

		if (scrollParent) {
			const parentRect = scrollParent.getBoundingClientRect();
			clipLeft = Math.max(0, parentRect.left - containerRect.left);
			clipRight = Math.min(elementWidth, parentRect.right - containerRect.left);
		} else {
			clipLeft = Math.max(0, -containerRect.left);
			clipRight = Math.min(
				elementWidth,
				window.innerWidth - containerRect.left,
			);
		}

		const visibleWidth = clipRight - clipLeft;
		if (visibleWidth <= 0) return;

		const dpr = window.devicePixelRatio || 1;
		const canvasW = Math.round(visibleWidth * dpr);
		const canvasH = Math.round(height * dpr);

		if (canvasW <= 0 || canvasH <= 0) return;

		canvas.width = canvasW;
		canvas.height = canvasH;
		canvas.style.width = `${visibleWidth}px`;
		canvas.style.height = `${height}px`;
		canvas.style.left = `${clipLeft}px`;

		const barCount = Math.max(1, Math.floor(visibleWidth / BAR_STEP));
		const startFraction = clipLeft / elementWidth;
		const endFraction = clipRight / elementWidth;
		const startSample = Math.floor(startFraction * buffer.length);
		const endSample = Math.min(
			buffer.length,
			Math.ceil(endFraction * buffer.length),
		);

		const peaks = extractRmsRange({
			buffer,
			count: barCount,
			startSample,
			endSample,
			globalMax: globalMaxRef.current,
		});

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, canvasW, canvasH);
		ctx.scale(dpr, dpr);
		ctx.fillStyle = color;

		const maxBarHeight = height * 0.7;

		for (let i = 0; i < barCount; i++) {
			const scaled = Math.log1p(peaks[i]) / Math.log1p(1);
			const barH = Math.max(1, scaled * maxBarHeight);
			ctx.fillRect(i * BAR_STEP, height - barH, BAR_WIDTH, barH);
		}
	}, [color]);

	useEffect(() => {
		let isCancelled = false;

		async function load() {
			let buffer = audioBuffer ?? null;

				if (!buffer && audioUrl) {
				try {
					const resp = await fetch(audioUrl);
					const arrayBuffer = await resp.arrayBuffer();
					const actx = new AudioContext();
					buffer = await actx.decodeAudioData(arrayBuffer);
					actx.close();
				} catch {
					return;
				}
			}

			if (!buffer || isCancelled) return;

			bufferRef.current = buffer;
			globalMaxRef.current = computeGlobalMaxRms({ buffer });
			drawVisible();
		}

		load();
		return () => {
			isCancelled = true;
		};
	}, [audioUrl, audioBuffer, drawVisible]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		scrollParentRef.current = findScrollParent({ element: container });
		const scrollParent = scrollParentRef.current;
		if (!scrollParent) return;

		scrollParent.addEventListener("scroll", drawVisible, { passive: true });
		return () => scrollParent.removeEventListener("scroll", drawVisible);
	}, [drawVisible]);

	const onResize = useCallback(
		(entry: ResizeObserverEntry) => {
			heightRef.current = entry.contentRect.height;
			drawVisible();
		},
		[drawVisible],
	);

	useResizeObserver({ ref: containerRef, onResize });

	return (
		<div ref={containerRef} className={cn("relative size-full", className)}>
			<canvas ref={canvasRef} className="absolute bottom-0" />
		</div>
	);
}

"use client";

import { cn } from "@/utils/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";

export const HANDLE_SIZE = 10;
export const HANDLE_HIT_AREA_SIZE = 18;
export const ICON_HANDLE_RADIUS = 10;
export const EDGE_HANDLE_THIN_SIZE = 6;
export const EDGE_HANDLE_THICK_SIZE = 14;
export const LINE_HIT_AREA_SIZE = 48;

export function getResizeCursor({ angleDeg }: { angleDeg: number }): string {
	const normalized = ((angleDeg % 180) + 180) % 180;
	if (normalized < 22.5 || normalized >= 157.5) return "cursor-ew-resize";
	if (normalized < 67.5) return "cursor-nwse-resize";
	if (normalized < 112.5) return "cursor-ns-resize";
	return "cursor-nesw-resize";
}

export function HandleButton({
	screen,
	cursor,
	hitAreaSize,
	className,
	onPointerDown,
	onPointerMove,
	onPointerUp,
	children,
}: {
	screen: { x: number; y: number };
	cursor?: string;
	hitAreaSize: number;
	className?: string;
	onPointerDown: (event: React.PointerEvent) => void;
	onPointerMove: (event: React.PointerEvent) => void;
	onPointerUp: (event: React.PointerEvent) => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			className={cn(
				"absolute flex items-center justify-center outline-none",
				cursor,
				className,
			)}
			style={{
				left: screen.x - hitAreaSize / 2,
				top: screen.y - hitAreaSize / 2,
				width: hitAreaSize,
				height: hitAreaSize,
				pointerEvents: "auto",
			}}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerLeave={onPointerUp}
			onKeyDown={(event) => event.key === "Enter" && event.preventDefault()}
			onKeyUp={(event) => event.key === "Enter" && event.preventDefault()}
		>
			{children}
		</button>
	);
}

export function CornerHandle({
	cursor,
	screen,
	onPointerDown,
	onPointerMove,
	onPointerUp,
}: {
	cursor?: string;
	screen: { x: number; y: number };
	onPointerDown: (event: React.PointerEvent) => void;
	onPointerMove: (event: React.PointerEvent) => void;
	onPointerUp: (event: React.PointerEvent) => void;
}) {
	return (
		<HandleButton
			screen={screen}
			cursor={cursor}
			hitAreaSize={HANDLE_HIT_AREA_SIZE}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
		>
			<div
				className="rounded-sm bg-white"
				style={{ width: HANDLE_SIZE, height: HANDLE_SIZE }}
			/>
		</HandleButton>
	);
}

export function EdgeHandle({
	edge,
	screen,
	rotation,
	onPointerDown,
	onPointerMove,
	onPointerUp,
}: {
	edge: "right" | "left" | "bottom";
	screen: { x: number; y: number };
	rotation: number;
	onPointerDown: (event: React.PointerEvent) => void;
	onPointerMove: (event: React.PointerEvent) => void;
	onPointerUp: (event: React.PointerEvent) => void;
}) {
	const isHorizontalEdge = edge === "right" || edge === "left";
	const width = isHorizontalEdge
		? EDGE_HANDLE_THIN_SIZE
		: EDGE_HANDLE_THICK_SIZE;
	const height = isHorizontalEdge
		? EDGE_HANDLE_THICK_SIZE
		: EDGE_HANDLE_THIN_SIZE;
	const cursor = getResizeCursor({
		angleDeg: isHorizontalEdge ? rotation : rotation + 90,
	});

	return (
		<HandleButton
			screen={screen}
			cursor={cursor}
			hitAreaSize={HANDLE_HIT_AREA_SIZE}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
		>
			<div
				className="rounded-sm bg-white"
				style={{ width, height, transform: `rotate(${rotation}deg)` }}
			/>
		</HandleButton>
	);
}

export function IconHandle({
	icon,
	screen,
	onPointerDown,
	onPointerMove,
	onPointerUp,
}: {
	icon: IconSvgElement;
	screen: { x: number; y: number };
	onPointerDown: (event: React.PointerEvent) => void;
	onPointerMove: (event: React.PointerEvent) => void;
	onPointerUp: (event: React.PointerEvent) => void;
}) {
	return (
		<HandleButton
			screen={screen}
			hitAreaSize={ICON_HANDLE_RADIUS * 2}
			className="rounded-full bg-white text-black shadow-sm"
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
		>
			<HugeiconsIcon icon={icon} className="size-3" strokeWidth={2.5} />
		</HandleButton>
	);
}

export function BoundingBoxOutline({
	center,
	outlineWidth,
	outlineHeight,
	rotation,
	cursor,
	dashed = false,
	onPointerDown,
	onPointerMove,
	onPointerUp,
}: {
	center: { x: number; y: number };
	outlineWidth: number;
	outlineHeight: number;
	rotation: number;
	cursor?: string;
	dashed?: boolean;
	onPointerDown?: (event: React.PointerEvent) => void;
	onPointerMove?: (event: React.PointerEvent) => void;
	onPointerUp?: (event: React.PointerEvent) => void;
}) {
	return (
		<svg
			className={cn("absolute overflow-visible", cursor)}
			aria-hidden="true"
			focusable="false"
			style={{
				left: center.x - outlineWidth / 2,
				top: center.y - outlineHeight / 2,
				width: outlineWidth,
				height: outlineHeight,
				transform: `rotate(${rotation}deg)`,
				transformOrigin: "center center",
				pointerEvents: onPointerDown ? "auto" : "none",
			}}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerLeave={onPointerUp}
		>
			<rect
				x={0.5}
				y={0.5}
				width={Math.max(outlineWidth - 1, 0)}
				height={Math.max(outlineHeight - 1, 0)}
				fill="transparent"
				stroke="white"
				strokeDasharray={dashed ? "4 4" : undefined}
				strokeOpacity={0.75}
				vectorEffect="non-scaling-stroke"
				style={{ pointerEvents: onPointerDown ? "all" : "none" }}
			/>
		</svg>
	);
}

export function ShapeOutline({
	center,
	outlineWidth,
	outlineHeight,
	rotation,
	pathData,
	cursor,
	onPointerDown,
	onPointerMove,
	onPointerUp,
}: {
	center: { x: number; y: number };
	outlineWidth: number;
	outlineHeight: number;
	rotation: number;
	pathData: string;
	cursor?: string;
	onPointerDown?: (event: React.PointerEvent) => void;
	onPointerMove?: (event: React.PointerEvent) => void;
	onPointerUp?: (event: React.PointerEvent) => void;
}) {
	return (
		<svg
			className={cn("absolute overflow-visible", cursor)}
			aria-hidden="true"
			focusable="false"
			style={{
				left: center.x - outlineWidth / 2,
				top: center.y - outlineHeight / 2,
				width: outlineWidth,
				height: outlineHeight,
				transform: `rotate(${rotation}deg)`,
				transformOrigin: "center center",
				pointerEvents: onPointerDown ? "auto" : "none",
			}}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerLeave={onPointerUp}
		>
			<path
				d={pathData}
				fill="transparent"
				stroke="white"
				strokeOpacity={0.75}
				vectorEffect="non-scaling-stroke"
				style={{ pointerEvents: onPointerDown ? "all" : "none" }}
			/>
		</svg>
	);
}

export function LineOverlay({
	start,
	end,
	onPointerDown,
	onPointerMove,
	onPointerUp,
}: {
	start: { x: number; y: number };
	end: { x: number; y: number };
	onPointerDown?: (event: React.PointerEvent) => void;
	onPointerMove?: (event: React.PointerEvent) => void;
	onPointerUp?: (event: React.PointerEvent) => void;
}) {
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const length = Math.sqrt(dx * dx + dy * dy);
	const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
	const cx = (start.x + end.x) / 2;
	const cy = (start.y + end.y) / 2;

	const sharedStyle = {
		left: cx - length / 2,
		width: length,
		transform: `rotate(${angleDeg}deg)`,
		transformOrigin: "center center",
	};

	return (
		<>
			{onPointerDown && (
				<div
					className="absolute"
					style={{
						...sharedStyle,
						top: cy - LINE_HIT_AREA_SIZE / 2,
						height: LINE_HIT_AREA_SIZE,
						pointerEvents: "auto",
					}}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onPointerLeave={onPointerUp}
				/>
			)}
			<div
				className="pointer-events-none absolute"
				style={{
					...sharedStyle,
					top: cy - 0.5,
					height: 1,
					backgroundColor: "white",
					opacity: 0.75,
				}}
			/>
		</>
	);
}

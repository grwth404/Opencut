"use client";

import { PEN_CURSOR } from "@/components/editor/panels/preview/cursors";
import { usePreviewViewport } from "@/components/editor/panels/preview/preview-viewport";
import { useMaskHandles } from "@/hooks/use-mask-handles";
import type { SnapLine } from "@/lib/preview/preview-snap";
import {
	CornerHandle,
	CircleHandle,
	CanvasPathOutline,
	EdgeHandle,
	IconHandle,
	LineOverlay,
	BoundingBoxOutline,
	ShapeOutline,
} from "./handle-primitives";

const CUSTOM_MASK_ANCHOR_SIZE = 7;
const CUSTOM_MASK_TANGENT_SIZE = 6;
import { Rotate01Icon, FeatherIcon } from "@hugeicons/core-free-icons";

export function MaskHandles({
	onSnapLinesChange,
}: {
	onSnapLinesChange?: (lines: SnapLine[]) => void;
}) {
	const viewport = usePreviewViewport();
	const {
		selectedWithMask,
		handlePositions,
		overlays,
		isCreatingCustomMask,
		handleCanvasPointerDown,
		handlePointerDown,
		handlePointerMove,
		handlePointerUp,
	} = useMaskHandles({ onSnapLinesChange });

	if (!selectedWithMask) return null;

	const toOverlay = ({
		canvasX,
		canvasY,
	}: {
		canvasX: number;
		canvasY: number;
	}) =>
		viewport.canvasToOverlay({
			canvasX,
			canvasY,
		});

	const { x: scaleX, y: scaleY } = viewport.getDisplayScale();
	const canvasOrigin = toOverlay({ canvasX: 0, canvasY: 0 });

	const onPointerMove = (event: React.PointerEvent) => {
		if (viewport.handlePanPointerMove({ event })) {
			return;
		}

		handlePointerMove({ event });
	};
	const onPointerUp = (event: React.PointerEvent) => {
		if (viewport.handlePanPointerUp({ event })) {
			return;
		}

		handlePointerUp();
	};
	const handleMaskPointerDown = ({
		event,
		handleId,
	}: {
		event: React.PointerEvent;
		handleId: string;
	}) => {
		if (viewport.handlePanPointerDown({ event })) {
			return;
		}

		handlePointerDown({ event, handleId });
	};
	const handleCanvasOverlayPointerDown = (event: React.PointerEvent) => {
		if (viewport.handlePanPointerDown({ event })) {
			return;
		}

		handleCanvasPointerDown({ event });
	};

	return (
		<div
			className="pointer-events-none absolute inset-0 overflow-hidden"
			aria-hidden
		>
			{isCreatingCustomMask ? (
				<div
					className="absolute inset-0 pointer-events-auto"
					style={{ cursor: PEN_CURSOR }}
					onPointerDown={handleCanvasOverlayPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onPointerCancel={onPointerUp}
				/>
			) : null}
			{overlays.map((overlay) => {
				const overlayHandleId = overlay.handleId;
				const pointerHandlers = overlayHandleId
					? {
							onPointerDown: (event: React.PointerEvent) =>
								handleMaskPointerDown({ event, handleId: overlayHandleId }),
							onPointerMove,
							onPointerUp,
						}
					: {};

				if (overlay.type === "line") {
					return (
						<LineOverlay
							key={overlay.id}
							cursor={overlay.cursor}
							start={toOverlay({
								canvasX: overlay.start.x,
								canvasY: overlay.start.y,
							})}
							end={toOverlay({
								canvasX: overlay.end.x,
								canvasY: overlay.end.y,
							})}
							{...pointerHandlers}
						/>
					);
				}

				if (overlay.type === "rect") {
					return (
						<BoundingBoxOutline
							key={overlay.id}
							center={toOverlay({
								canvasX: overlay.center.x,
								canvasY: overlay.center.y,
							})}
							outlineWidth={overlay.width * scaleX}
							outlineHeight={overlay.height * scaleY}
							rotation={overlay.rotation}
							cursor={overlay.cursor}
							dashed={overlay.dashed}
							{...pointerHandlers}
						/>
					);
				}

				if (overlay.type === "shape") {
					return (
						<ShapeOutline
							key={overlay.id}
							center={toOverlay({
								canvasX: overlay.center.x,
								canvasY: overlay.center.y,
							})}
							outlineWidth={overlay.width * scaleX}
							outlineHeight={overlay.height * scaleY}
							rotation={overlay.rotation}
							pathData={overlay.pathData}
							cursor={overlay.cursor}
							{...pointerHandlers}
						/>
					);
				}

				if (overlay.type === "canvas-path") {
					return (
						<CanvasPathOutline
							key={overlay.id}
							pathData={overlay.pathData}
							translateX={
								overlay.coordinateSpace === "canvas" ? canvasOrigin.x : 0
							}
							translateY={
								overlay.coordinateSpace === "canvas" ? canvasOrigin.y : 0
							}
							scaleX={overlay.coordinateSpace === "canvas" ? scaleX : 1}
							scaleY={overlay.coordinateSpace === "canvas" ? scaleY : 1}
							cursor={overlay.cursor}
							strokeWidth={overlay.strokeWidth}
							strokeOpacity={overlay.strokeOpacity}
							{...pointerHandlers}
						/>
					);
				}

				return null;
			})}
			{handlePositions.map((handle) => {
				const screen = toOverlay({ canvasX: handle.x, canvasY: handle.y });

				if (handle.kind === "icon" && handle.icon === "rotate") {
					return (
						<IconHandle
							key={handle.id}
							icon={Rotate01Icon}
							screen={screen}
							onPointerDown={(event) =>
								handleMaskPointerDown({ event, handleId: handle.id })
							}
							onPointerMove={onPointerMove}
							onPointerUp={onPointerUp}
						/>
					);
				}

				if (handle.kind === "icon" && handle.icon === "feather") {
					return (
						<IconHandle
							key={handle.id}
							icon={FeatherIcon}
							screen={screen}
							onPointerDown={(event) =>
								handleMaskPointerDown({ event, handleId: handle.id })
							}
							onPointerMove={onPointerMove}
							onPointerUp={onPointerUp}
						/>
					);
				}

				if (handle.kind === "edge" && handle.edgeAxis === "horizontal") {
					return (
						<EdgeHandle
							key={handle.id}
							edge="right"
							screen={screen}
							rotation={handle.rotation ?? 0}
							onPointerDown={(event) =>
								handleMaskPointerDown({ event, handleId: handle.id })
							}
							onPointerMove={onPointerMove}
							onPointerUp={onPointerUp}
						/>
					);
				}

				if (handle.kind === "edge" && handle.edgeAxis === "vertical") {
					return (
						<EdgeHandle
							key={handle.id}
							edge="bottom"
							screen={screen}
							rotation={handle.rotation ?? 0}
							onPointerDown={(event) =>
								handleMaskPointerDown({ event, handleId: handle.id })
							}
							onPointerMove={onPointerMove}
							onPointerUp={onPointerUp}
						/>
					);
				}

				if (handle.kind === "point" || handle.kind === "tangent") {
					return (
						<CircleHandle
							key={handle.id}
							screen={screen}
							size={
								handle.kind === "tangent"
									? CUSTOM_MASK_TANGENT_SIZE
									: CUSTOM_MASK_ANCHOR_SIZE
							}
							isSelected={handle.isSelected}
							onPointerDown={(event) =>
								handleMaskPointerDown({ event, handleId: handle.id })
							}
							onPointerMove={onPointerMove}
							onPointerUp={onPointerUp}
						/>
					);
				}

				if (handle.kind === "corner") {
					return (
						<CornerHandle
							key={handle.id}
							screen={screen}
							onPointerDown={(event) =>
								handleMaskPointerDown({ event, handleId: handle.id })
							}
							onPointerMove={onPointerMove}
							onPointerUp={onPointerUp}
						/>
					);
				}

				return (
					<CornerHandle
						key={handle.id}
						cursor={handle.cursor}
						screen={screen}
						onPointerDown={(event) =>
							handleMaskPointerDown({ event, handleId: handle.id })
						}
						onPointerMove={onPointerMove}
						onPointerUp={onPointerUp}
					/>
				);
			})}
		</div>
	);
}

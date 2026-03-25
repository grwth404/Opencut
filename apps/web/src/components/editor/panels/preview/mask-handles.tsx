"use client";

import { usePreviewViewport } from "@/components/editor/panels/preview/preview-viewport";
import { useMaskHandles } from "@/hooks/use-mask-handles";
import { masksRegistry } from "@/lib/masks";
import type { SnapLine } from "@/lib/preview/preview-snap";
import type { ParamValues } from "@/lib/params";
import type { RectangleMaskParams } from "@/lib/masks/types";
import {
	CornerHandle,
	EdgeHandle,
	IconHandle,
	LineOverlay,
	BoundingBoxOutline,
	ShapeOutline,
} from "./handle-primitives";
import { Rotate01Icon, FeatherIcon } from "@hugeicons/core-free-icons";

function hasRectangleOutlineParams(
	params: ParamValues,
): params is RectangleMaskParams {
	return (
		typeof params.centerX === "number" &&
		typeof params.centerY === "number" &&
		typeof params.width === "number" &&
		typeof params.height === "number"
	);
}

export function MaskHandles({
	onSnapLinesChange,
}: {
	onSnapLinesChange?: (lines: SnapLine[]) => void;
}) {
	const viewport = usePreviewViewport();
	const {
		selectedWithMask,
		handlePositions,
		linePoints,
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

	const def = masksRegistry.get(selectedWithMask.mask.type);
	const { bounds } = selectedWithMask;
	const maskRotation = selectedWithMask.mask.params.rotation;

	const { x: scaleX, y: scaleY } = viewport.getDisplayScale();

	const rectangleOutlineProps = hasRectangleOutlineParams(
		selectedWithMask.mask.params,
	)
		? {
				center: toOverlay({
					canvasX:
						bounds.cx + selectedWithMask.mask.params.centerX * bounds.width,
					canvasY:
						bounds.cy + selectedWithMask.mask.params.centerY * bounds.height,
				}),
				outlineWidth:
					selectedWithMask.mask.params.width * bounds.width * scaleX,
				outlineHeight:
					selectedWithMask.mask.params.height * bounds.height * scaleY,
				rotation: maskRotation,
			}
		: null;

	const onPointerMove = (event: React.PointerEvent) =>
		handlePointerMove({ event });
	const onPointerUp = () => handlePointerUp();

	return (
		<div
			className="pointer-events-none absolute inset-0 overflow-hidden"
			aria-hidden
		>
			{def.overlayShape === "line" && linePoints && (
				<LineOverlay
					start={toOverlay({
						canvasX: linePoints.start.x,
						canvasY: linePoints.start.y,
					})}
					end={toOverlay({
						canvasX: linePoints.end.x,
						canvasY: linePoints.end.y,
					})}
					onPointerDown={(event) =>
						handlePointerDown({ event, handleId: "position" })
					}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
				/>
			)}
			{def.overlayShape === "box" && rectangleOutlineProps && (
				def.buildOverlayPath ? (
						<>
							<BoundingBoxOutline {...rectangleOutlineProps} dashed />
							<ShapeOutline
								{...rectangleOutlineProps}
								pathData={def.buildOverlayPath({
									width: rectangleOutlineProps.outlineWidth,
									height: rectangleOutlineProps.outlineHeight,
								})}
								onPointerDown={(event) =>
									handlePointerDown({ event, handleId: "position" })
								}
								onPointerMove={onPointerMove}
								onPointerUp={onPointerUp}
							/>
						</>
					) : (
						<BoundingBoxOutline
							{...rectangleOutlineProps}
							cursor="cursor-move"
							onPointerDown={(event) =>
								handlePointerDown({ event, handleId: "position" })
							}
							onPointerMove={onPointerMove}
							onPointerUp={onPointerUp}
						/>
					)
			)}
			{handlePositions.map((handle) => {
				const screen = toOverlay({ canvasX: handle.x, canvasY: handle.y });

				if (handle.id === "rotation") {
					return (
						<IconHandle
							key={handle.id}
							icon={Rotate01Icon}
							screen={screen}
							onPointerDown={(event) =>
								handlePointerDown({ event, handleId: handle.id })
							}
							onPointerMove={onPointerMove}
							onPointerUp={onPointerUp}
						/>
					);
				}

				if (handle.id === "feather") {
					return (
						<IconHandle
							key={handle.id}
							icon={FeatherIcon}
							screen={screen}
							onPointerDown={(event) =>
								handlePointerDown({ event, handleId: handle.id })
							}
							onPointerMove={onPointerMove}
							onPointerUp={onPointerUp}
						/>
					);
				}

				if (handle.id === "right" || handle.id === "left") {
					return (
						<EdgeHandle
							key={handle.id}
							edge="right"
							screen={screen}
							rotation={maskRotation}
							onPointerDown={(event) =>
								handlePointerDown({ event, handleId: handle.id })
							}
							onPointerMove={onPointerMove}
							onPointerUp={onPointerUp}
						/>
					);
				}

				if (handle.id === "bottom" || handle.id === "top") {
					return (
						<EdgeHandle
							key={handle.id}
							edge="bottom"
							screen={screen}
							rotation={maskRotation}
							onPointerDown={(event) =>
								handlePointerDown({ event, handleId: handle.id })
							}
							onPointerMove={onPointerMove}
							onPointerUp={onPointerUp}
						/>
					);
				}

				if (
					handle.id === "top-left" ||
					handle.id === "top-right" ||
					handle.id === "bottom-left" ||
					handle.id === "bottom-right" ||
					handle.id === "scale"
				) {
					return (
						<CornerHandle
							key={handle.id}
							screen={screen}
							onPointerDown={(event) =>
								handlePointerDown({ event, handleId: handle.id })
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
							handlePointerDown({ event, handleId: handle.id })
						}
						onPointerMove={onPointerMove}
						onPointerUp={onPointerUp}
					/>
				);
			})}
		</div>
	);
}

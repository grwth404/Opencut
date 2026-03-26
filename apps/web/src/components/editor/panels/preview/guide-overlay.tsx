"use client";

import { getGuideById } from "@/lib/guides";
import { usePreviewStore } from "@/stores/preview-store";
import { usePreviewViewport } from "./preview-viewport";

export function GuideOverlay() {
	const activeGuide = usePreviewStore((state) => state.activeGuide);
	const viewport = usePreviewViewport();
	const guide = getGuideById(activeGuide);

	if (!guide) {
		return null;
	}

	return (
		<div
			className="pointer-events-none absolute"
			style={{
				left: viewport.sceneLeft,
				top: viewport.sceneTop,
				width: viewport.sceneWidth,
				height: viewport.sceneHeight,
			}}
		>
			{guide.renderOverlay({
				width: viewport.sceneWidth,
				height: viewport.sceneHeight,
			})}
		</div>
	);
}

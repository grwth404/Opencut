"use client";

import {
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { usePreviewViewport } from "@/components/editor/panels/preview/preview-viewport";
import { useEditor } from "@/hooks/use-editor";
import { usePreviewStore } from "@/stores/preview-store";
import { toast } from "sonner";

export function PreviewContextMenu({
	onToggleFullscreen,
	containerRef,
}: {
	onToggleFullscreen: () => void;
	containerRef: React.RefObject<HTMLElement | null>;
}) {
	const editor = useEditor();
	const viewport = usePreviewViewport();
	const { overlays, setOverlayVisibility } = usePreviewStore();

	const handleCopySnapshot = async () => {
		const result = await editor.renderer.copySnapshot();

		if (!result.success) {
			toast.error("Failed to copy snapshot", {
				description: result.error ?? "Please try again",
			});
			return;
		}
	};

	const handleSaveSnapshot = async () => {
		const result = await editor.renderer.saveSnapshot();

		if (!result.success) {
			toast.error("Failed to save snapshot", {
				description: result.error ?? "Please try again",
			});
			return;
		}
	};

	return (
		<ContextMenuContent className="w-56" container={containerRef.current}>
			<ContextMenuItem onClick={viewport.fitToScreen} inset>
				Fit to screen
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem onClick={onToggleFullscreen} inset>
				Full screen
			</ContextMenuItem>
			<ContextMenuItem onClick={handleSaveSnapshot} inset>
				Save snapshot
			</ContextMenuItem>
			<ContextMenuItem onClick={handleCopySnapshot} inset>
				Copy snapshot
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuCheckboxItem
				checked={overlays.bookmarks}
				onCheckedChange={(checked) =>
					setOverlayVisibility({ overlay: "bookmarks", isVisible: !!checked })
				}
			>
				Show bookmark notes
			</ContextMenuCheckboxItem>
		</ContextMenuContent>
	);
}

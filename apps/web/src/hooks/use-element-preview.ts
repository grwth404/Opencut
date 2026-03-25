import { useEditor } from "@/hooks/use-editor";
import type { TimelineElement } from "@/lib/timeline";

/**
 * Subscribes to render tracks and returns the live (preview-aware) version of
 * an element alongside helpers for previewing and committing updates.
 *
 * Use this wherever property fields need to reflect in-progress preview state
 * (e.g. a slider being dragged) rather than the last committed value.
 */
export function useElementPreview<T extends TimelineElement>({
	trackId,
	elementId,
	fallback,
}: {
	trackId: string;
	elementId: string;
	fallback: T;
}) {
	const editor = useEditor();
	useEditor((e) => e.timeline.getRenderTracks());

	const renderElement =
		(editor.timeline
			.getRenderTracks()
			.find((t) => t.id === trackId)
			?.elements.find((el) => el.id === elementId) as T | undefined) ??
		fallback;

	const previewUpdates = (updates: Partial<TimelineElement>) =>
		editor.timeline.previewElements({
			updates: [{ trackId, elementId, updates }],
		});

	const commit = () => editor.timeline.commitPreview();

	return { renderElement, previewUpdates, commit };
}

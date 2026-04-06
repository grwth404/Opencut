import { useEditor } from "@/hooks/use-editor";
import { getElementLocalTime } from "@/lib/animation";

export function useElementPlayhead({
	startTime,
	duration,
}: {
	startTime: number;
	duration: number;
}) {
	const playheadTime = useEditor((editor) => editor.playback.getCurrentTime());
	const localTime = getElementLocalTime({
		timelineTime: playheadTime,
		elementStartTime: startTime,
		elementDuration: duration,
	});
	const isPlayheadWithinElementRange =
		playheadTime >= startTime &&
		playheadTime <= startTime + duration;

	return { localTime, isPlayheadWithinElementRange };
}

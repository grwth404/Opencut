import { Video, Music, TypeIcon } from "lucide-react";
import type { TimelineTrack } from "@/types/timeline";

export function TrackIcon({ track }: { track: TimelineTrack }) {
	return (
		<>
			{track.type === "media" && (
				<Video className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
			)}
			{track.type === "text" && (
				<TypeIcon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
			)}
			{track.type === "audio" && (
				<Music className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
			)}
		</>
	);
}

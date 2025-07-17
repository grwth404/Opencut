import { Plus } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../../ui/context-menu";
import { useTimelineStore } from "@/stores/timeline-store";
import { TimelineTrackContent } from "./timeline-track";
import { TrackIcon } from "./track-icon";
import { getTrackHeight } from "@/constants/timeline-constants";
import type { TimelineTrack } from "@/types/timeline";
import type { SnapPoint } from "@/hooks/use-timeline-snapping";

export interface TimelineTracksAreaProps {
  tracks: TimelineTrack[];
  zoomLevel: number;
  handleSnapPointChange: (snapPoint: SnapPoint | null) => void;
  clearSelectedElements: () => void;
}

export function TimelineTracksArea({
  tracks,
  zoomLevel,
  handleSnapPointChange,
  clearSelectedElements,
}: TimelineTracksAreaProps) {
  const { toggleTrackMute } = useTimelineStore();

  return (
    <>
      <div className="h-full flex flex-col absolute left-0 top-0 w-24 bg-panel border-r border-black z-[100]">
        <div className="sticky left-0 h-5 border-inset z-[100]"></div>

        {tracks.map((track, index) => (
          <div
            key={track.id}
            className="sticky left-0 flex items-center border-b border-panel border-inset group z-[100]"
            style={{ height: `${getTrackHeight(track.type)}px` }}
          >
            <div className="flex items-center gap-2 px-2">
              <TrackIcon track={track} />
            </div>
            {track.muted && (
              <span className="text-xs text-red-500 font-semibold">Muted</span>
            )}
          </div>
        ))}
      </div>

      <div className="h-full flex flex-col pt-5 ml-24">
        {tracks.map((track, index) => (
          <ContextMenu key={track.id}>
            <ContextMenuTrigger asChild>
              <div
                className="h-full"
                style={{ height: `${getTrackHeight(track.type)}px` }}
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest(".timeline-element")) {
                    clearSelectedElements();
                  }
                }}
              >
                <TimelineTrackContent
                  track={track}
                  zoomLevel={zoomLevel}
                  onSnapPointChange={handleSnapPointChange}
                />
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => toggleTrackMute(track.id)}>
                {track.muted ? "Unmute Track" : "Mute Track"}
              </ContextMenuItem>
              <ContextMenuItem>Track settings (soon)</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}

        <div style={{ height: `${getTrackHeight("media")}px` }}></div>
      </div>
    </>
  );
}

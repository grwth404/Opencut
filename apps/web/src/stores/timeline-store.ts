import { create } from "zustand";

export interface TimelineClip {
  id: string;
  mediaId: string;
  name: string;
  duration: number;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: "video" | "audio" | "effects";
  clips: TimelineClip[];
}

interface TimelineStore {
  tracks: TimelineTrack[];

  // Actions
  addTrack: (type: "video" | "audio" | "effects") => string;
  removeTrack: (trackId: string) => void;
  addClipToTrack: (trackId: string, clip: Omit<TimelineClip, "id">) => void;
  removeClipFromTrack: (trackId: string, clipId: string) => void;
  moveClipToTrack: (
    fromTrackId: string,
    toTrackId: string,
    clipId: string,
    insertIndex?: number
  ) => void;
  reorderClipInTrack: (
    trackId: string,
    clipId: string,
    newIndex: number
  ) => void;
}

export const useTimelineStore = create<TimelineStore>((set) => ({
  tracks: [],

  addTrack: (type) => {
    const newTrack: TimelineTrack = {
      id: crypto.randomUUID(),
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track`,
      type,
      clips: [],
    };
    set((state) => ({
      tracks: [...state.tracks, newTrack],
    }));
    return newTrack.id;
  },

  removeTrack: (trackId) => {
    set((state) => ({
      tracks: state.tracks.filter((track) => track.id !== trackId),
    }));
  },

  addClipToTrack: (trackId, clipData) => {
    const newClip: TimelineClip = {
      ...clipData,
      id: crypto.randomUUID(),
    };

    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? { ...track, clips: [...track.clips, newClip] }
          : track
      ),
    }));
  },

  removeClipFromTrack: (trackId, clipId) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              clips: track.clips.filter((clip) => clip.id !== clipId),
            }
          : track
      ),
    }));
  },

  moveClipToTrack: (fromTrackId, toTrackId, clipId, insertIndex) => {
    set((state) => {
      // Find the clip to move
      const fromTrack = state.tracks.find((track) => track.id === fromTrackId);
      const clipToMove = fromTrack?.clips.find((clip) => clip.id === clipId);

      if (!clipToMove) return state;

      return {
        tracks: state.tracks.map((track) => {
          if (track.id === fromTrackId) {
            // Remove clip from source track
            return {
              ...track,
              clips: track.clips.filter((clip) => clip.id !== clipId),
            };
          } else if (track.id === toTrackId) {
            // Add clip to destination track
            const newClips = [...track.clips];
            const index =
              insertIndex !== undefined ? insertIndex : newClips.length;
            newClips.splice(index, 0, clipToMove);
            return {
              ...track,
              clips: newClips,
            };
          }
          return track;
        }),
      };
    });
  },

  reorderClipInTrack: (trackId, clipId, newIndex) => {
    set((state) => ({
      tracks: state.tracks.map((track) => {
        if (track.id !== trackId) return track;

        const clipIndex = track.clips.findIndex((clip) => clip.id === clipId);
        if (clipIndex === -1) return track;

        const newClips = [...track.clips];
        const [movedClip] = newClips.splice(clipIndex, 1);
        newClips.splice(newIndex, 0, movedClip);

        return { ...track, clips: newClips };
      }),
    }));
  },
}));

import { create } from "zustand";

export interface MediaItem {
  id: string;
  name: string;
  type: "image" | "video" | "audio";
}

interface MediaStore {
  mediaItems: MediaItem[];

  // Actions
  addMediaItem: (item: Omit<MediaItem, "id">) => void;
  removeMediaItem: (id: string) => void;
}

export const useMediaStore = create<MediaStore>((set, get) => ({
  mediaItems: [],

  addMediaItem: (item) => {
    const newItem: MediaItem = {
      ...item,
      id: crypto.randomUUID(),
    };
    set((state) => ({
      mediaItems: [...state.mediaItems, newItem],
    }));
  },

  removeMediaItem: (id) => {
    set((state) => ({
      mediaItems: state.mediaItems.filter((item) => item.id !== id),
    }));
  },
}));

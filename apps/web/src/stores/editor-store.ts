import { create } from "zustand";

interface EditorState {
  // Loading states
  isInitializing: boolean;
  isPanelsReady: boolean;

  // Actions
  setInitializing: (loading: boolean) => void;
  setPanelsReady: (ready: boolean) => void;
  initializeApp: () => Promise<void>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial states
  isInitializing: true,
  isPanelsReady: false,

  // Actions
  setInitializing: (loading) => {
    set({ isInitializing: loading });
  },

  setPanelsReady: (ready) => {
    set({ isPanelsReady: ready });
  },

  initializeApp: async () => {
    console.log("Initializing video editor...");
    set({ isInitializing: true, isPanelsReady: false });

    set({ isPanelsReady: true, isInitializing: false });
    console.log("Video editor ready");
  },
}));

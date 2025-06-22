import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PanelState {
  // Horizontal panel sizes
  toolsPanel: number;
  previewPanel: number;
  propertiesPanel: number;

  // Vertical panel sizes
  mainContent: number;
  timeline: number;

  // Flag to prevent initial overwrites
  isInitialized: boolean;

  // Actions
  setToolsPanel: (size: number) => void;
  setPreviewPanel: (size: number) => void;
  setPropertiesPanel: (size: number) => void;
  setMainContent: (size: number) => void;
  setTimeline: (size: number) => void;
  setInitialized: () => void;
}

export const usePanelStore = create<PanelState>()(
  persist(
    (set, get) => ({
      // Default sizes
      toolsPanel: 20,
      previewPanel: 60,
      propertiesPanel: 20,
      mainContent: 50,
      timeline: 50,
      isInitialized: false,

      // Actions
      setToolsPanel: (size) => {
        const state = get();
        if (!state.isInitialized) return;
        set({ toolsPanel: size });
      },
      setPreviewPanel: (size) => {
        const state = get();
        if (!state.isInitialized) return;
        set({ previewPanel: size });
      },
      setPropertiesPanel: (size) => {
        const state = get();
        if (!state.isInitialized) return;
        set({ propertiesPanel: size });
      },
      setMainContent: (size) => {
        const state = get();
        if (!state.isInitialized) return;
        set({ mainContent: size });
      },
      setTimeline: (size) => {
        const state = get();
        if (!state.isInitialized) return;
        set({ timeline: size });
      },
      setInitialized: () => {
        console.log("Panel store initialized for resize events");
        set({ isInitialized: true });
      },
    }),
    {
      name: "panel-sizes",
      partialize: (state) => ({
        toolsPanel: state.toolsPanel,
        previewPanel: state.previewPanel,
        propertiesPanel: state.propertiesPanel,
        mainContent: state.mainContent,
        timeline: state.timeline,
      }),
    }
  )
);

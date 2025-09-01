import { create } from "zustand";
import { Scene } from "@/types/project";
import { useProjectStore } from "./project-store";
import { useTimelineStore } from "./timeline-store";
import { storageService } from "@/lib/storage/storage-service";
import { generateUUID } from "@/lib/utils";

export function getMainScene({ scenes }: { scenes: Scene[] }): Scene | null {
  return scenes.find((scene) => scene.isMain) || null;
}

interface SceneStore {
  // Current scene state
  currentScene: Scene | null;
  scenes: Scene[];

  // Scene management
  createScene: ({
    name,
    isMain,
  }: {
    name: string;
    isMain: boolean;
  }) => Promise<string>;
  renameScene: ({
    sceneId,
    name,
  }: {
    sceneId: string;
    name: string;
  }) => Promise<void>;
  switchToScene: ({ sceneId }: { sceneId: string }) => Promise<void>;

  // Scene utilities
  getMainScene: () => Scene | null;
  getCurrentScene: () => Scene | null;

  // Project integration
  loadProjectScenes: ({ projectId }: { projectId: string }) => Promise<void>;
  initializeScenes: ({
    scenes,
    currentSceneId,
  }: {
    scenes: Scene[];
    currentSceneId?: string;
  }) => void;
  clearScenes: () => void;
}

export const useSceneStore = create<SceneStore>((set, get) => ({
  currentScene: null,
  scenes: [],

  createScene: async ({ name, isMain = false }) => {
    const { scenes } = get();

    const newScene = {
      id: generateUUID(),
      name,
      isMain,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const updatedScenes = [...scenes, newScene];

    const projectStore = useProjectStore.getState();
    const { activeProject } = projectStore;

    if (!activeProject) {
      throw new Error("No active project");
    }

    const updatedProject = {
      ...activeProject,
      scenes: updatedScenes,
      updatedAt: new Date(),
    };

    try {
      await storageService.saveProject({ project: updatedProject });
      useProjectStore.setState({ activeProject: updatedProject });
      set({ scenes: updatedScenes });
      return newScene.id;
    } catch (error) {
      console.error("Failed to create scene:", error);
      throw error;
    }
  },

  renameScene: async ({ sceneId, name }: { sceneId: string; name: string }) => {
    const { scenes } = get();
    const updatedScenes = scenes.map((scene) =>
      scene.id === sceneId ? { ...scene, name, updatedAt: new Date() } : scene
    );

    // Update project
    const projectStore = useProjectStore.getState();
    const { activeProject } = projectStore;

    if (!activeProject) {
      throw new Error("No active project");
    }

    const updatedProject = {
      ...activeProject,
      scenes: updatedScenes,
      updatedAt: new Date(),
    };

    try {
      await storageService.saveProject({ project: updatedProject });
      useProjectStore.setState({ activeProject: updatedProject });
      set({
        scenes: updatedScenes,
        currentScene: updatedScenes.find((s) => s.id === sceneId) || null,
      });
    } catch (error) {
      console.error("Failed to rename scene:", error);
      throw error;
    }
  },

  switchToScene: async ({ sceneId }: { sceneId: string }) => {
    const { scenes } = get();
    const targetScene = scenes.find((s) => s.id === sceneId);

    if (!targetScene) {
      throw new Error("Scene not found");
    }

    const timelineStore = useTimelineStore.getState();
    const projectStore = useProjectStore.getState();
    const { activeProject } = projectStore;
    const { currentScene } = get();

    if (activeProject && currentScene) {
      await timelineStore.saveProjectTimeline({
        projectId: activeProject.id,
        sceneId: currentScene.id,
      });
    }

    if (activeProject) {
      await timelineStore.loadProjectTimeline({
        projectId: activeProject.id,
        sceneId,
      });

      const updatedProject = {
        ...activeProject,
        currentSceneId: sceneId,
        updatedAt: new Date(),
      };

      await storageService.saveProject({ project: updatedProject });
      useProjectStore.setState({ activeProject: updatedProject });
    }

    set({ currentScene: targetScene });
  },

  getMainScene: () => {
    const { scenes } = get();
    return scenes.find((scene) => scene.isMain) || null;
  },

  getCurrentScene: () => {
    return get().currentScene;
  },

  loadProjectScenes: async ({ projectId }: { projectId: string }) => {
    try {
      const project = await storageService.loadProject({ id: projectId });
      if (project?.scenes) {
        const ensuredScenes = project.scenes.map((scene) => ({
          ...scene,
          isMain: scene.isMain || false,
        }));
        const currentScene =
          ensuredScenes.find((s) => s.id === project.currentSceneId) ||
          ensuredScenes[0];

        set({
          scenes: ensuredScenes,
          currentScene,
        });
      }
    } catch (error) {
      console.error("Failed to load project scenes:", error);
      set({ scenes: [], currentScene: null });
    }
  },

  initializeScenes: ({
    scenes,
    currentSceneId,
  }: {
    scenes: Scene[];
    currentSceneId?: string;
  }) => {
    const currentScene = currentSceneId
      ? scenes.find((s) => s.id === currentSceneId)
      : null;

    const fallbackScene = getMainScene({ scenes });

    set({
      scenes,
      currentScene: currentScene || fallbackScene,
    });
  },

  clearScenes: () => {
    set({
      scenes: [],
      currentScene: null,
    });
  },
}));

import { create } from "zustand";

interface PropertiesState {
	activeTabPerType: Record<string, string>;
	setActiveTab: (elementType: string, tabId: string) => void;
	isTransformScaleLocked: boolean;
	setTransformScaleLocked: (locked: boolean) => void;
}

export const usePropertiesStore = create<PropertiesState>()((set) => ({
	activeTabPerType: {},
	setActiveTab: (elementType, tabId) =>
		set((state) => ({
			activeTabPerType: { ...state.activeTabPerType, [elementType]: tabId },
		})),
	isTransformScaleLocked: false,
	setTransformScaleLocked: (locked) => set({ isTransformScaleLocked: locked }),
}));

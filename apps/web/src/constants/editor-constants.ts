export type TPlatformLayout =
	| "tiktok"
	| "instagram"
	| "youtube"
	| "snapchat";

export const PREVIEW_ZOOM_PRESETS = [25, 50, 75, 100, 150, 200];

export const PREVIEW_ZOOM = {
	min: 0.25,
	max: 16,
	step: 1.25,
};

export const PANEL_CONFIG = {
	panels: {
		tools: 25,
		preview: 50,
		properties: 25,
		mainContent: 50,
		timeline: 50,
	},
};

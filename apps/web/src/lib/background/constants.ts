export const BACKGROUND_BLUR_INTENSITY_PRESETS: Array<{
	label: string;
	value: number;
}> = [
	{ label: "Light", value: 10 },
	{ label: "Medium", value: 50 },
	{ label: "Heavy", value: 100 },
] as const;

export const DEFAULT_BACKGROUND_BLUR_INTENSITY = 10;
export const DEFAULT_BACKGROUND_COLOR = "#000000";

import type { FrameRate } from "opencut-wasm";

export const FPS_PRESETS = [
	{ value: "24", label: "24 fps" },
	{ value: "25", label: "25 fps" },
	{ value: "30", label: "30 fps" },
	{ value: "60", label: "60 fps" },
	{ value: "120", label: "120 fps" },
] as const;

export const DEFAULT_FPS: FrameRate = { numerator: 30, denominator: 1 };

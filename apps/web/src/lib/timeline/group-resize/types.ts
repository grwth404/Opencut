import type { FrameRate } from "opencut-wasm";
import type { ElementRef, RetimeConfig } from "@/lib/timeline/types";

export type ResizeSide = "left" | "right";

export interface GroupResizeMember extends ElementRef {
	startTime: number;
	duration: number;
	trimStart: number;
	trimEnd: number;
	sourceDuration?: number;
	retime?: RetimeConfig;
	leftNeighborBound: number;
	rightNeighborBound: number;
}

export interface GroupResizeUpdate extends ElementRef {
	patch: {
		trimStart: number;
		trimEnd: number;
		startTime: number;
		duration: number;
	};
}

export interface GroupResizeResult {
	deltaTime: number;
	updates: GroupResizeUpdate[];
}

export interface ComputeGroupResizeArgs {
	members: GroupResizeMember[];
	side: ResizeSide;
	deltaTime: number;
	fps: FrameRate;
}

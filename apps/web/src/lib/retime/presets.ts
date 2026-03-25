import type { RetimeConfig } from "@/lib/timeline";
import { clampRetimeRate } from "@/constants/retime-constants";

export function buildConstantRetime({
	rate,
	maintainPitch = false,
}: {
	rate: number;
	maintainPitch?: boolean;
}): RetimeConfig {
	return { rate: clampRetimeRate({ rate }), maintainPitch };
}

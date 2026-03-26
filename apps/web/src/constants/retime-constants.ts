export const DEFAULT_RETIME_RATE = 1;
export const MIN_RETIME_RATE = 0.01;
export const MAX_RETIME_RATE = 5;
export const MAX_PITCH_PRESERVE_RATE = 10;

export function clampRetimeRate({ rate }: { rate: number }): number {
	if (!Number.isFinite(rate) || rate <= 0) {
		return DEFAULT_RETIME_RATE;
	}

	return Math.min(Math.max(rate, MIN_RETIME_RATE), MAX_RETIME_RATE);
}

export function canMaintainPitch({ rate }: { rate: number }): boolean {
	if (!Number.isFinite(rate) || rate <= 0) {
		return false;
	}

	return clampRetimeRate({ rate }) <= MAX_PITCH_PRESERVE_RATE;
}

export function shouldMaintainPitch({
	rate,
	maintainPitch,
}: {
	rate: number;
	maintainPitch?: boolean;
}): boolean {
	return maintainPitch === true && canMaintainPitch({ rate });
}

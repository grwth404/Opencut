import { TICKS_PER_SECOND } from "@/wasm/ticks";

export const DEFAULT_NEW_ELEMENT_DURATION = 5 * TICKS_PER_SECOND;

/**
 * Resolves the duration in ticks that a newly created timeline element
 * should have, given an optional source duration in seconds.
 *
 * Falls back to {@link DEFAULT_NEW_ELEMENT_DURATION} when the source has
 * no known duration (e.g. stickers, graphics, text, or media whose
 * probe failed).
 */
export function toElementDurationTicks({
	seconds,
}: {
	seconds: number | null | undefined;
}): number {
	if (seconds == null) return DEFAULT_NEW_ELEMENT_DURATION;
	return Math.round(seconds * TICKS_PER_SECOND);
}

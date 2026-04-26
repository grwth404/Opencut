import {
	lastFrameTime as _lastFrameTime,
	parseTimecode as _parseTimecode,
	roundToFrame as _roundToFrame,
	snappedSeekTime as _snappedSeekTime,
	TICKS_PER_SECOND as _TICKS_PER_SECOND,
	mediaTimeFromSeconds as _mediaTimeFromSeconds,
	mediaTimeToSeconds as _mediaTimeToSeconds,
	type FrameRate,
	type TimeCodeFormat,
} from "opencut-wasm";

/**
 * Integer-tick time. Mirrors `MediaTime(i64)` in `rust/crates/time/src/media_time.rs`.
 *
 * `opencut-wasm` exposes `MediaTime` as a bare `number` alias because tsify
 * collapses tuple structs. The brand here is the TS-side discipline that
 * recovers the invariant: a `MediaTime` is an integer count of ticks, and the
 * only legal way to construct one from a fractional `number` is `roundMediaTime`
 * (or `mediaTimeFromSeconds`, which rounds inside the wasm boundary).
 *
 * Reading is free — `MediaTime` is assignable to `number`. Writing is gated —
 * a bare `number` is not assignable to `MediaTime`.
 */
export type MediaTime = number & { readonly __mediaTime: unique symbol };

export const TICKS_PER_SECOND = _TICKS_PER_SECOND();

export const ZERO_MEDIA_TIME = 0 as MediaTime;

/**
 * Construct a `MediaTime` from a known-integer tick count. Asserts in dev that
 * the value is actually an integer; cast in release. Use `roundMediaTime` when
 * the input may be fractional.
 */
export function mediaTime({ ticks }: { ticks: number }): MediaTime {
	if (process.env.NODE_ENV !== "production" && !Number.isInteger(ticks)) {
		throw new Error(
			`mediaTime() requires an integer tick count, got ${ticks}. Use roundMediaTime() for fractional values.`,
		);
	}
	return ticks as MediaTime;
}

/**
 * Project a fractional value onto the integer-tick lattice.
 *
 * Rounds half away from zero (`-1.5 → -2`, `1.5 → 2`) and normalises `-0` to
 * `0`. The away-from-zero rule matches Rust's `.round()` and avoids the
 * `Math.round(-0.5) === -0` quirk that propagates `-0` into stored data.
 */
export function roundMediaTime({ time }: { time: number }): MediaTime {
	const roundedMagnitude = Math.round(Math.abs(time));
	if (roundedMagnitude === 0) {
		return 0 as MediaTime;
	}
	return (time < 0 ? -roundedMagnitude : roundedMagnitude) as MediaTime;
}

export function mediaTimeFromSeconds({
	seconds,
}: {
	seconds: number;
}): MediaTime {
	const result = _mediaTimeFromSeconds({ seconds });
	if (result === undefined) {
		throw new Error(
			`mediaTimeFromSeconds: rust returned undefined for seconds=${seconds}`,
		);
	}
	return result as MediaTime;
}

export function mediaTimeToSeconds({ time }: { time: MediaTime }): number {
	return _mediaTimeToSeconds({ time });
}

/**
 * Sum `MediaTime` values. Inputs are integer ticks, so the sum is integer too;
 * the cast is a no-op at runtime, only re-establishes the brand for the type
 * system.
 */
export function addMediaTime({
	a,
	b,
}: {
	a: MediaTime;
	b: MediaTime;
}): MediaTime {
	return (a + b) as MediaTime;
}

export function subMediaTime({
	a,
	b,
}: {
	a: MediaTime;
	b: MediaTime;
}): MediaTime {
	return (a - b) as MediaTime;
}

export function maxMediaTime({
	a,
	b,
}: {
	a: MediaTime;
	b: MediaTime;
}): MediaTime {
	return (a > b ? a : b) as MediaTime;
}

export function minMediaTime({
	a,
	b,
}: {
	a: MediaTime;
	b: MediaTime;
}): MediaTime {
	return (a < b ? a : b) as MediaTime;
}

export function clampMediaTime({
	time,
	min,
	max,
}: {
	time: MediaTime;
	min: MediaTime;
	max: MediaTime;
}): MediaTime {
	if (time < min) return min;
	if (time > max) return max;
	return time;
}

export function roundFrameTime({
	time,
	fps,
}: {
	time: MediaTime;
	fps: FrameRate;
}): MediaTime {
	return (_roundToFrame({ time, rate: fps }) ?? time) as MediaTime;
}

export function roundFrameTicks({
	ticks,
	fps,
}: {
	ticks: number;
	fps: FrameRate;
}): number {
	return _roundToFrame({ time: ticks, rate: fps }) ?? ticks;
}

export function snapSeekMediaTime({
	time,
	duration,
	fps,
}: {
	time: MediaTime;
	duration: MediaTime;
	fps: FrameRate;
}): MediaTime {
	return (_snappedSeekTime({ time, duration, rate: fps }) ?? time) as MediaTime;
}

export function lastFrameMediaTime({
	duration,
	fps,
}: {
	duration: MediaTime;
	fps: FrameRate;
}): MediaTime {
	return (_lastFrameTime({ duration, rate: fps }) ?? duration) as MediaTime;
}

export function parseMediaTimecode({
	timeCode,
	format,
	fps,
}: {
	timeCode: string;
	format: TimeCodeFormat;
	fps: FrameRate;
}): MediaTime | null {
	const parsedTime = _parseTimecode({ timeCode, format, rate: fps });
	return parsedTime == null ? null : (parsedTime as MediaTime);
}

import { roundToFrame } from "opencut-wasm";
import {
	getSourceSpanAtClipTime,
	getTimelineDurationForSourceSpan,
} from "@/retime";
import { TICKS_PER_SECOND } from "@/wasm";
import type {
	ComputeGroupResizeArgs,
	GroupResizeMember,
	GroupResizeResult,
	GroupResizeUpdate,
	ResizeSide,
} from "./types";

export function computeGroupResize({
	members,
	side,
	deltaTime,
	fps,
}: ComputeGroupResizeArgs): GroupResizeResult {
	const minDuration = Math.round(
		(TICKS_PER_SECOND * fps.denominator) / fps.numerator,
	);
	const minimumDeltaTime = Math.max(
		...members.map((member) =>
			getMinimumAllowedDeltaTime({
				member,
				side,
				minDuration,
			}),
		),
	);
	const maximumDeltaTime = Math.min(
		...members.map((member) =>
			getMaximumAllowedDeltaTime({
				member,
				side,
				minDuration,
			}),
		),
	);
	const clampedDeltaTime =
		minimumDeltaTime > maximumDeltaTime
			? minimumDeltaTime
			: Math.min(maximumDeltaTime, Math.max(minimumDeltaTime, deltaTime));

	// Snap the drag delta to a frame exactly once, then derive every patch
	// field from that single snapped value. This keeps the invariant
	// `trimStart + duration*rate + trimEnd == sourceDuration` exact: the same
	// delta is added on one side of the element and removed from the other,
	// so the rounding cancels by construction. Per-field rounding (the old
	// approach) couldn't preserve this because the individual rounds don't
	// compose when `sourceDuration` isn't frame-aligned.
	const snappedDeltaTime =
		roundToFrame({ time: clampedDeltaTime, rate: fps }) ?? clampedDeltaTime;
	// Re-clamp after rounding. Bounds derived from other elements are
	// frame-aligned, so this is normally a no-op; at the source-extent limit
	// the bound may not be frame-aligned, and honouring the bound takes
	// precedence over frame alignment (you can't extend past real content).
	const finalDeltaTime =
		minimumDeltaTime > maximumDeltaTime
			? minimumDeltaTime
			: Math.min(
					maximumDeltaTime,
					Math.max(minimumDeltaTime, snappedDeltaTime),
				);

	return {
		deltaTime: Object.is(finalDeltaTime, -0) ? 0 : finalDeltaTime,
		updates: members.map((member) =>
			buildResizeUpdate({
				member,
				side,
				deltaTime: finalDeltaTime,
			}),
		),
	};
}

function buildResizeUpdate({
	member,
	side,
	deltaTime,
}: {
	member: GroupResizeMember;
	side: ResizeSide;
	deltaTime: number;
}): GroupResizeUpdate {
	const sourceDelta = getSourceDeltaForClipDelta({
		member,
		clipDelta: deltaTime,
	});

	if (side === "left") {
		return {
			trackId: member.trackId,
			elementId: member.elementId,
			patch: {
				trimStart: Math.max(0, member.trimStart + sourceDelta),
				trimEnd: member.trimEnd,
				startTime: member.startTime + deltaTime,
				duration: member.duration - deltaTime,
			},
		};
	}

	return {
		trackId: member.trackId,
		elementId: member.elementId,
		patch: {
			trimStart: member.trimStart,
			trimEnd: Math.max(0, member.trimEnd - sourceDelta),
			startTime: member.startTime,
			duration: member.duration + deltaTime,
		},
	};
}

function getMinimumAllowedDeltaTime({
	member,
	side,
	minDuration,
}: {
	member: GroupResizeMember;
	side: ResizeSide;
	minDuration: number;
}): number {
	if (side === "right") {
		return minDuration - member.duration;
	}

	const leftNeighborFloor = Number.isFinite(member.leftNeighborBound)
		? member.leftNeighborBound - member.startTime
		: -member.startTime;
	if (member.sourceDuration == null) {
		return leftNeighborFloor;
	}

	const maximumSourceExtension =
		getDurationForVisibleSourceSpan({
			member,
			sourceSpan:
				getVisibleSourceSpanForDuration({
					member,
					duration: member.duration,
				}) + member.trimStart,
		}) - member.duration;
	return Math.max(leftNeighborFloor, -maximumSourceExtension);
}

function getMaximumAllowedDeltaTime({
	member,
	side,
	minDuration,
}: {
	member: GroupResizeMember;
	side: ResizeSide;
	minDuration: number;
}): number {
	if (side === "left") {
		return member.duration - minDuration;
	}

	const rightNeighborCeiling = Number.isFinite(member.rightNeighborBound)
		? member.rightNeighborBound - (member.startTime + member.duration)
		: Infinity;
	if (member.sourceDuration == null) {
		return rightNeighborCeiling;
	}

	const maximumVisibleSourceSpan =
		getSourceDuration({ member }) - member.trimStart;
	const maximumDuration = getDurationForVisibleSourceSpan({
		member,
		sourceSpan: maximumVisibleSourceSpan,
	});
	return Math.min(rightNeighborCeiling, maximumDuration - member.duration);
}

function getSourceDeltaForClipDelta({
	member,
	clipDelta,
}: {
	member: GroupResizeMember;
	clipDelta: number;
}): number {
	if (!member.retime) {
		return clipDelta;
	}

	return clipDelta >= 0
		? getSourceSpanAtClipTime({
				clipTime: clipDelta,
				retime: member.retime,
			})
		: -getSourceSpanAtClipTime({
				clipTime: Math.abs(clipDelta),
				retime: member.retime,
			});
}

function getVisibleSourceSpanForDuration({
	member,
	duration,
}: {
	member: GroupResizeMember;
	duration: number;
}): number {
	if (!member.retime) {
		return duration;
	}

	return getSourceSpanAtClipTime({
		clipTime: duration,
		retime: member.retime,
	});
}

function getDurationForVisibleSourceSpan({
	member,
	sourceSpan,
}: {
	member: GroupResizeMember;
	sourceSpan: number;
}): number {
	if (!member.retime) {
		return sourceSpan;
	}

	return getTimelineDurationForSourceSpan({
		sourceSpan,
		retime: member.retime,
	});
}

function getSourceDuration({ member }: { member: GroupResizeMember }): number {
	if (typeof member.sourceDuration === "number") {
		return member.sourceDuration;
	}

	return (
		member.trimStart +
		getVisibleSourceSpanForDuration({
			member,
			duration: member.duration,
		}) +
		member.trimEnd
	);
}

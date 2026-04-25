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
	deltaTicks,
	fps,
}: ComputeGroupResizeArgs): GroupResizeResult {
	const minDuration = Math.round(
		(TICKS_PER_SECOND * fps.denominator) / fps.numerator,
	);
	const minimumDeltaTicks = Math.max(
		...members.map((member) =>
			getMinimumAllowedDeltaTicks({
				member,
				side,
				minDuration,
			}),
		),
	);
	const maximumDeltaTicks = Math.min(
		...members.map((member) =>
			getMaximumAllowedDeltaTicks({
				member,
				side,
				minDuration,
			}),
		),
	);
	const clampedDeltaTicks =
		minimumDeltaTicks > maximumDeltaTicks
			? minimumDeltaTicks
			: Math.min(maximumDeltaTicks, Math.max(minimumDeltaTicks, deltaTicks));

	// Snap the drag delta to a frame exactly once, then derive every patch
	// field from that single snapped value. This keeps the invariant
	// `trimStart + duration*rate + trimEnd == sourceDuration` exact: the same
	// delta is added on one side of the element and removed from the other,
	// so the rounding cancels by construction. Rounding each field
	// independently would break this — the individual rounds don't compose
	// when `sourceDuration` isn't frame-aligned.
	const snappedDeltaTicks =
		roundToFrame({ time: clampedDeltaTicks, rate: fps }) ?? clampedDeltaTicks;
	// Re-clamp after rounding. Bounds derived from other elements are
	// frame-aligned, so this is normally a no-op; at the source-extent limit
	// the bound may not be frame-aligned, and honouring the bound takes
	// precedence over frame alignment (you can't extend past real content).
	const finalDeltaTicks =
		minimumDeltaTicks > maximumDeltaTicks
			? minimumDeltaTicks
			: Math.min(
					maximumDeltaTicks,
					Math.max(minimumDeltaTicks, snappedDeltaTicks),
				);

	return {
		deltaTicks: Object.is(finalDeltaTicks, -0) ? 0 : finalDeltaTicks,
		updates: members.map((member) =>
			buildResizeUpdate({
				member,
				side,
				deltaTicks: finalDeltaTicks,
			}),
		),
	};
}

function buildResizeUpdate({
	member,
	side,
	deltaTicks,
}: {
	member: GroupResizeMember;
	side: ResizeSide;
	deltaTicks: number;
}): GroupResizeUpdate {
	const sourceDelta = getSourceDeltaForClipDelta({
		member,
		clipDelta: deltaTicks,
	});

	if (side === "left") {
		return {
			trackId: member.trackId,
			elementId: member.elementId,
			patch: {
				trimStart: Math.max(0, member.trimStart + sourceDelta),
				trimEnd: member.trimEnd,
				startTime: member.startTime + deltaTicks,
				duration: member.duration - deltaTicks,
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
			duration: member.duration + deltaTicks,
		},
	};
}

function getMinimumAllowedDeltaTicks({
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

function getMaximumAllowedDeltaTicks({
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

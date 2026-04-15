import { roundToFrame } from "opencut-wasm";
import {
	getSourceSpanAtClipTime,
	getTimelineDurationForSourceSpan,
} from "@/lib/retime";
import { TICKS_PER_SECOND } from "@/lib/wasm";
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

	return {
		deltaTime: Object.is(clampedDeltaTime, -0) ? 0 : clampedDeltaTime,
		updates: members.map((member) =>
			buildResizeUpdate({
				member,
				side,
				deltaTime: clampedDeltaTime,
				fps,
			}),
		),
	};
}

function buildResizeUpdate({
	member,
	side,
	deltaTime,
	fps,
}: {
	member: GroupResizeMember;
	side: ResizeSide;
	deltaTime: number;
	fps: ComputeGroupResizeArgs["fps"];
}): GroupResizeUpdate {
	const totalSourceDuration = getSourceDuration({ member });
	const sourceDelta = getSourceDeltaForClipDelta({
		member,
		clipDelta: deltaTime,
	});
	const visibleSourceSpan = getVisibleSourceSpanForDuration({
		member,
		duration: member.duration,
	});

	if (side === "left") {
		if (deltaTime < 0 && member.sourceDuration == null) {
			const rawStartTime = member.startTime + deltaTime;
			const rawDuration = member.duration - deltaTime;
			return {
				trackId: member.trackId,
				elementId: member.elementId,
				patch: {
					trimStart: Math.max(0, member.trimStart + sourceDelta),
					trimEnd: member.trimEnd,
					startTime:
						roundToFrame({ time: rawStartTime, rate: fps }) ?? rawStartTime,
					duration:
						roundToFrame({ time: rawDuration, rate: fps }) ?? rawDuration,
				},
			};
		}

		const nextTrimStart = Math.max(0, member.trimStart + sourceDelta);
		const nextVisibleSourceSpan = Math.max(
			0,
			totalSourceDuration - nextTrimStart - member.trimEnd,
		);
		const rawDuration = getDurationForVisibleSourceSpan({
			member,
			sourceSpan: nextVisibleSourceSpan,
		});
		const nextDuration =
			roundToFrame({ time: rawDuration, rate: fps }) ?? rawDuration;
		const rawStartTime = member.startTime + (member.duration - nextDuration);
		return {
			trackId: member.trackId,
			elementId: member.elementId,
			patch: {
				trimStart:
					roundToFrame({ time: nextTrimStart, rate: fps }) ?? nextTrimStart,
				trimEnd: member.trimEnd,
				startTime:
					roundToFrame({ time: rawStartTime, rate: fps }) ?? rawStartTime,
				duration: nextDuration,
			},
		};
	}

	const nextVisibleSourceSpan = Math.max(0, visibleSourceSpan + sourceDelta);
	if (deltaTime > 0 && member.sourceDuration == null) {
		const rawDuration = member.duration + deltaTime;
		return {
			trackId: member.trackId,
			elementId: member.elementId,
			patch: {
				trimStart: member.trimStart,
				trimEnd: Math.max(0, member.trimEnd - sourceDelta),
				startTime: member.startTime,
				duration: roundToFrame({ time: rawDuration, rate: fps }) ?? rawDuration,
			},
		};
	}

	const nextTrimEnd = Math.max(
		0,
		totalSourceDuration - member.trimStart - nextVisibleSourceSpan,
	);
	const rawDuration = getDurationForVisibleSourceSpan({
		member,
		sourceSpan: nextVisibleSourceSpan,
	});
	return {
		trackId: member.trackId,
		elementId: member.elementId,
		patch: {
			trimStart: member.trimStart,
			trimEnd: roundToFrame({ time: nextTrimEnd, rate: fps }) ?? nextTrimEnd,
			startTime: member.startTime,
			duration: roundToFrame({ time: rawDuration, rate: fps }) ?? rawDuration,
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

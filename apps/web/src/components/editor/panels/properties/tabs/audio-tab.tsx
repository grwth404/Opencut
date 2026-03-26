import { NumberField } from "@/components/ui/number-field";
import { VOLUME_DB_MAX, VOLUME_DB_MIN } from "@/lib/timeline/audio-constants";
import { DEFAULTS } from "@/lib/timeline/defaults";
import { clamp, isNearlyEqual } from "@/utils/math";
import type { AudioElement, VideoElement } from "@/lib/timeline";
import { resolveNumberAtTime } from "@/lib/animation";
import { useElementPlayhead } from "../hooks/use-element-playhead";
import { useKeyframedNumberProperty } from "../hooks/use-keyframed-number-property";
import { KeyframeToggle } from "../components/keyframe-toggle";
import { HugeiconsIcon } from "@hugeicons/react";
import { VolumeHighIcon } from "@hugeicons/core-free-icons";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";

export function AudioTab({
	element,
	trackId,
}: {
	element: AudioElement | VideoElement;
	trackId: string;
}) {
	const { localTime, isPlayheadWithinElementRange } = useElementPlayhead({
		startTime: element.startTime,
		duration: element.duration,
	});
	const resolvedVolume = resolveNumberAtTime({
		baseValue: element.volume ?? DEFAULTS.element.volume,
		animations: element.animations,
		propertyPath: "volume",
		localTime,
	});
	const volume = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "volume",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: resolvedVolume.toFixed(1),
		parse: (input) => {
			const parsed = parseFloat(input);
			if (Number.isNaN(parsed)) {
				return null;
			}

			return clamp({ value: parsed, min: VOLUME_DB_MIN, max: VOLUME_DB_MAX });
		},
		valueAtPlayhead: resolvedVolume,
		step: 0.1,
		buildBaseUpdates: ({ value }) => ({
			volume: value,
		}),
	});
	const isDefault =
		volume.hasAnimatedKeyframes && isPlayheadWithinElementRange
			? isNearlyEqual({
					leftValue: resolvedVolume,
					rightValue: DEFAULTS.element.volume,
				})
			: (element.volume ?? DEFAULTS.element.volume) === DEFAULTS.element.volume;

	return (
		<Section collapsible sectionKey={`${element.id}:audio`}>
			<SectionHeader>
				<SectionTitle>Audio</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<SectionFields>
					<SectionField
						label="Volume"
						beforeLabel={
							<KeyframeToggle
								isActive={volume.isKeyframedAtTime}
								isDisabled={!isPlayheadWithinElementRange}
								title="Toggle volume keyframe"
								onToggle={volume.toggleKeyframe}
							/>
						}
					>
						<NumberField
							icon={<HugeiconsIcon icon={VolumeHighIcon} />}
							value={volume.displayValue}
							onFocus={volume.onFocus}
							onChange={volume.onChange}
							onBlur={volume.onBlur}
							dragSensitivity="slow"
							scrubClamp={{ min: VOLUME_DB_MIN, max: VOLUME_DB_MAX }}
							onScrub={volume.scrubTo}
							onScrubEnd={volume.commitScrub}
							onReset={() =>
								volume.commitValue({
									value: DEFAULTS.element.volume,
								})
							}
							isDefault={isDefault}
							suffix="dB"
						/>
					</SectionField>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

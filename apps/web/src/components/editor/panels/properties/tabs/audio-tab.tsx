import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/ui/number-field";
import { VOLUME_DB_MAX, VOLUME_DB_MIN } from "@/lib/timeline/audio-constants";
import { isSourceAudioSeparated } from "@/lib/timeline/audio-separation";
import { DEFAULTS } from "@/lib/timeline/defaults";
import {
	clamp,
	formatNumberForDisplay,
	getFractionDigitsForStep,
	isNearlyEqual,
	snapToStep,
} from "@/utils/math";
import type { AudioElement, VideoElement } from "@/lib/timeline";
import { resolveNumberAtTime } from "@/lib/animation";
import { useEditor } from "@/hooks/use-editor";
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

const VOLUME_STEP = 0.1;
const VOLUME_FRACTION_DIGITS = getFractionDigitsForStep({ step: VOLUME_STEP });

export function AudioTab({
	element,
	trackId,
}: {
	element: AudioElement | VideoElement;
	trackId: string;
}) {
	const editor = useEditor();
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
		displayValue: formatNumberForDisplay({
			value: resolvedVolume,
			fractionDigits: VOLUME_FRACTION_DIGITS,
		}),
		parse: (input) => {
			const parsed = parseFloat(input);
			if (Number.isNaN(parsed)) {
				return null;
			}

			return clamp({
				value: snapToStep({ value: parsed, step: VOLUME_STEP }),
				min: VOLUME_DB_MIN,
				max: VOLUME_DB_MAX,
			});
		},
		valueAtPlayhead: resolvedVolume,
		step: VOLUME_STEP,
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
	const isSeparated =
		element.type === "video" && isSourceAudioSeparated({ element });

	return (
		<>
			{isSeparated && (
				<div className="mx-4 mt-4 rounded-md border bg-muted/30 p-3">
					<p className="text-sm">Audio has been separated.</p>
					<Button
						className="mt-3"
						size="sm"
						variant="secondary"
						onClick={() =>
							editor.timeline.toggleSourceAudioSeparation({
								trackId,
								elementId: element.id,
							})
						}
					>
						Recover audio
					</Button>
				</div>
			)}
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
		</>
	);
}

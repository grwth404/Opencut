import { NumberField } from "@/components/ui/number-field";
import { useEditor } from "@/hooks/use-editor";
import { clamp, isNearlyEqual } from "@/utils/math";
import type { VisualElement } from "@/lib/timeline";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowExpandIcon,
	Link05Icon,
	RotateClockwiseIcon,
} from "@hugeicons/core-free-icons";
import {
	getGroupKeyframesAtTime,
	hasGroupKeyframeAtTime,
	resolveTransformAtTime,
} from "@/lib/animation";
import { DEFAULTS } from "@/lib/timeline/defaults";
import { useElementPlayhead } from "../hooks/use-element-playhead";
import { KeyframeToggle } from "../components/keyframe-toggle";
import { useKeyframedNumberProperty } from "../hooks/use-keyframed-number-property";
import { useKeyframedVectorProperty } from "../hooks/use-keyframed-vector-property";
import { usePropertiesStore } from "../stores/properties-store";

export function parseNumericInput({ input }: { input: string }): number | null {
	const parsed = parseFloat(input);
	return Number.isNaN(parsed) ? null : parsed;
}

export function isPropertyAtDefault({
	hasAnimatedKeyframes,
	isPlayheadWithinElementRange,
	resolvedValue,
	staticValue,
	defaultValue,
}: {
	hasAnimatedKeyframes: boolean;
	isPlayheadWithinElementRange: boolean;
	resolvedValue: number;
	staticValue: number;
	defaultValue: number;
}): boolean {
	if (hasAnimatedKeyframes && isPlayheadWithinElementRange) {
		return isNearlyEqual({
			leftValue: resolvedValue,
			rightValue: defaultValue,
		});
	}

	return staticValue === defaultValue;
}

export function TransformTab({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const editor = useEditor();
	const isScaleLocked = usePropertiesStore((s) => s.isTransformScaleLocked);
	const setTransformScaleLocked = usePropertiesStore(
		(s) => s.setTransformScaleLocked,
	);
	const { localTime, isPlayheadWithinElementRange } = useElementPlayhead({
		startTime: element.startTime,
		duration: element.duration,
	});
	const resolvedTransform = resolveTransformAtTime({
		baseTransform: element.transform,
		animations: element.animations,
		localTime,
	});

	const position = useKeyframedVectorProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "transform.position",
		localTime,
		isPlayheadWithinElementRange,
		resolvedValue: resolvedTransform.position,
		displayX: Math.round(resolvedTransform.position.x).toString(),
		displayY: Math.round(resolvedTransform.position.y).toString(),
		parseComponent: (input) => parseNumericInput({ input }),
		step: 1,
		buildBaseUpdates: ({ value }) => ({
			transform: { ...element.transform, position: value },
		}),
	});

	const parseScale = (input: string) => {
		const parsed = parseNumericInput({ input });
		if (parsed === null) return null;
		return parsed / 100;
	};

	const scaleX = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "transform.scaleX",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: Math.round(resolvedTransform.scaleX * 100).toString(),
		parse: parseScale,
		valueAtPlayhead: resolvedTransform.scaleX,
		step: 0.01,
		buildBaseUpdates: ({ value }) => ({
			transform: {
				...element.transform,
				scaleX: value,
				...(isScaleLocked ? { scaleY: value } : {}),
			},
		}),
		buildAdditionalKeyframes: isScaleLocked
			? ({ value }) => [{ propertyPath: "transform.scaleY", value }]
			: undefined,
	});

	const scaleY = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "transform.scaleY",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: Math.round(resolvedTransform.scaleY * 100).toString(),
		parse: parseScale,
		valueAtPlayhead: resolvedTransform.scaleY,
		step: 0.01,
		buildBaseUpdates: ({ value }) => ({
			transform: {
				...element.transform,
				scaleY: value,
				...(isScaleLocked ? { scaleX: value } : {}),
			},
		}),
		buildAdditionalKeyframes: isScaleLocked
			? ({ value }) => [{ propertyPath: "transform.scaleX", value }]
			: undefined,
	});

	const scaleFieldPropsX = {
		value: scaleX.displayValue,
		onFocus: scaleX.onFocus,
		onChange: scaleX.onChange,
		onBlur: scaleX.onBlur,
		dragSensitivity: "slow" as const,
		onScrub: scaleX.scrubTo,
		onScrubEnd: scaleX.commitScrub,
		onReset: () =>
			scaleX.commitValue({ value: DEFAULTS.element.transform.scaleX }),
		isDefault: isPropertyAtDefault({
			hasAnimatedKeyframes: scaleX.hasAnimatedKeyframes,
			isPlayheadWithinElementRange,
			resolvedValue: resolvedTransform.scaleX,
			staticValue: element.transform.scaleX,
			defaultValue: DEFAULTS.element.transform.scaleX,
		}),
	};

	const scaleFieldPropsY = {
		value: scaleY.displayValue,
		onFocus: scaleY.onFocus,
		onChange: scaleY.onChange,
		onBlur: scaleY.onBlur,
		dragSensitivity: "slow" as const,
		onScrub: scaleY.scrubTo,
		onScrubEnd: scaleY.commitScrub,
		onReset: () =>
			scaleY.commitValue({ value: DEFAULTS.element.transform.scaleY }),
		isDefault: isPropertyAtDefault({
			hasAnimatedKeyframes: scaleY.hasAnimatedKeyframes,
			isPlayheadWithinElementRange,
			resolvedValue: resolvedTransform.scaleY,
			staticValue: element.transform.scaleY,
			defaultValue: DEFAULTS.element.transform.scaleY,
		}),
	};

	const rotation = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "transform.rotate",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: Math.round(resolvedTransform.rotate).toString(),
		parse: (input) => {
			const parsed = parseNumericInput({ input });
			if (parsed === null) return null;
			return clamp({ value: parsed, min: -360, max: 360 });
		},
		valueAtPlayhead: resolvedTransform.rotate,
		step: 1,
		buildBaseUpdates: ({ value }) => ({
			transform: {
				...element.transform,
				rotate: value,
			},
		}),
	});

	const hasScaleKeyframe = hasGroupKeyframeAtTime({
		animations: element.animations,
		group: "transform.scale",
		time: localTime,
	});

	const toggleScaleKeyframe = () => {
		if (!isPlayheadWithinElementRange) return;
		const existing = getGroupKeyframesAtTime({
			animations: element.animations,
			group: "transform.scale",
			time: localTime,
		});
		if (existing.length > 0) {
			editor.timeline.removeKeyframes({
				keyframes: existing.map((ref) => ({
					trackId,
					elementId: element.id,
					...ref,
				})),
			});
			return;
		}
		editor.timeline.upsertKeyframes({
			keyframes: [
				{
					trackId,
					elementId: element.id,
					propertyPath: "transform.scaleX",
					time: localTime,
					value: resolvedTransform.scaleX,
				},
				{
					trackId,
					elementId: element.id,
					propertyPath: "transform.scaleY",
					time: localTime,
					value: resolvedTransform.scaleY,
				},
			],
		});
	};

	const scaleLockButton = (
		<Button
			type="button"
			variant={isScaleLocked ? "secondary" : "ghost"}
			size="icon"
			aria-pressed={isScaleLocked}
			onClick={() => setTransformScaleLocked(!isScaleLocked)}
		>
			<HugeiconsIcon icon={Link05Icon} />
		</Button>
	);

	return (
		<Section collapsible sectionKey={`${element.id}:transform`}>
			<SectionHeader>
				<SectionTitle>Transform</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<SectionFields>
					<div className="flex items-end gap-2">
						{isScaleLocked ? (
							<>
								<SectionField
									label="Scale"
									className="min-w-0 flex-1"
									beforeLabel={
										<KeyframeToggle
											isActive={hasScaleKeyframe}
											isDisabled={!isPlayheadWithinElementRange}
											title="Toggle scale keyframe"
											onToggle={toggleScaleKeyframe}
										/>
									}
								>
									<NumberField
										icon={<HugeiconsIcon icon={ArrowExpandIcon} />}
										{...scaleFieldPropsX}
									/>
								</SectionField>
								{scaleLockButton}
							</>
						) : (
							<>
								<SectionField
									label="Width"
									className="min-w-0 flex-1"
									beforeLabel={
										<KeyframeToggle
											isActive={scaleX.isKeyframedAtTime}
											isDisabled={!isPlayheadWithinElementRange}
											title="Toggle width scale keyframe"
											onToggle={scaleX.toggleKeyframe}
										/>
									}
								>
									<NumberField icon="W" {...scaleFieldPropsX} />
								</SectionField>
								{scaleLockButton}
								<SectionField
									label="Height"
									className="min-w-0 flex-1"
									beforeLabel={
										<KeyframeToggle
											isActive={scaleY.isKeyframedAtTime}
											isDisabled={!isPlayheadWithinElementRange}
											title="Toggle height scale keyframe"
											onToggle={scaleY.toggleKeyframe}
										/>
									}
								>
									<NumberField icon="H" {...scaleFieldPropsY} />
								</SectionField>
							</>
						)}
					</div>
					<SectionField
						label="Position"
						beforeLabel={
							<KeyframeToggle
								isActive={position.isKeyframedAtTime}
								isDisabled={!isPlayheadWithinElementRange}
								title="Toggle position keyframe"
								onToggle={position.toggleKeyframe}
							/>
						}
					>
						<div className="flex items-center gap-2">
							<NumberField
								icon="X"
								className="flex-1"
								value={position.x.displayValue}
								onFocus={position.x.onFocus}
								onChange={position.x.onChange}
								onBlur={position.x.onBlur}
								onScrub={position.x.scrubTo}
								onScrubEnd={position.x.commitScrub}
								onReset={() =>
									position.commitX({
										value: DEFAULTS.element.transform.position.x,
									})
								}
								isDefault={isPropertyAtDefault({
									hasAnimatedKeyframes: position.hasAnimatedKeyframes,
									isPlayheadWithinElementRange,
									resolvedValue: resolvedTransform.position.x,
									staticValue: element.transform.position.x,
									defaultValue: DEFAULTS.element.transform.position.x,
								})}
							/>
							<NumberField
								icon="Y"
								className="flex-1"
								value={position.y.displayValue}
								onFocus={position.y.onFocus}
								onChange={position.y.onChange}
								onBlur={position.y.onBlur}
								onScrub={position.y.scrubTo}
								onScrubEnd={position.y.commitScrub}
								onReset={() =>
									position.commitY({
										value: DEFAULTS.element.transform.position.y,
									})
								}
								isDefault={isPropertyAtDefault({
									hasAnimatedKeyframes: position.hasAnimatedKeyframes,
									isPlayheadWithinElementRange,
									resolvedValue: resolvedTransform.position.y,
									staticValue: element.transform.position.y,
									defaultValue: DEFAULTS.element.transform.position.y,
								})}
							/>
						</div>
					</SectionField>

					<SectionField
						label="Rotation"
						beforeLabel={
							<KeyframeToggle
								isActive={rotation.isKeyframedAtTime}
								isDisabled={!isPlayheadWithinElementRange}
								title="Toggle rotation keyframe"
								onToggle={rotation.toggleKeyframe}
							/>
						}
					>
						<div className="flex items-center gap-2">
							<NumberField
								icon={<HugeiconsIcon icon={RotateClockwiseIcon} />}
								className="flex-none"
								value={rotation.displayValue}
								onFocus={rotation.onFocus}
								onChange={rotation.onChange}
								onBlur={rotation.onBlur}
								dragSensitivity="slow"
								onScrub={rotation.scrubTo}
								onScrubEnd={rotation.commitScrub}
								onReset={() =>
									rotation.commitValue({
										value: DEFAULTS.element.transform.rotate,
									})
								}
								isDefault={isPropertyAtDefault({
									hasAnimatedKeyframes: rotation.hasAnimatedKeyframes,
									isPlayheadWithinElementRange,
									resolvedValue: resolvedTransform.rotate,
									staticValue: element.transform.rotate,
									defaultValue: DEFAULTS.element.transform.rotate,
								})}
							/>
						</div>
					</SectionField>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

import { useEditor } from "@/hooks/use-editor";
import { clamp } from "@/utils/math";
import { NumberField } from "@/components/ui/number-field";
import { OcCheckerboardIcon } from "@/components/icons";
import { Fragment, useRef } from "react";
import { useMenuPreview } from "@/hooks/use-menu-preview";
import {
	Section,
	SectionContent,
	SectionField,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { BlendMode } from "@/lib/rendering";
import type { ElementType } from "@/lib/timeline";
import type { ElementAnimations } from "@/lib/animation/types";
import { HugeiconsIcon } from "@hugeicons/react";
import { RainDropIcon } from "@hugeicons/core-free-icons";
import { KeyframeToggle } from "../components/keyframe-toggle";
import { useKeyframedNumberProperty } from "../hooks/use-keyframed-number-property";
import { useElementPlayhead } from "../hooks/use-element-playhead";
import { resolveOpacityAtTime } from "@/lib/animation";
import { DEFAULTS } from "@/lib/timeline/defaults";
import { isPropertyAtDefault } from "./transform-tab";

type BlendingElement = {
	id: string;
	opacity: number;
	type: ElementType;
	blendMode?: BlendMode;
	startTime: number;
	duration: number;
	animations?: ElementAnimations;
};

const BLEND_MODE_GROUPS: { value: BlendMode; label: string }[][] = [
	[{ value: "normal", label: "Normal" }],
	[
		{ value: "darken", label: "Darken" },
		{ value: "multiply", label: "Multiply" },
		{ value: "color-burn", label: "Color Burn" },
	],
	[
		{ value: "lighten", label: "Lighten" },
		{ value: "screen", label: "Screen" },
		{ value: "plus-lighter", label: "Plus Lighter" },
		{ value: "color-dodge", label: "Color Dodge" },
	],
	[
		{ value: "overlay", label: "Overlay" },
		{ value: "soft-light", label: "Soft Light" },
		{ value: "hard-light", label: "Hard Light" },
	],
	[
		{ value: "difference", label: "Difference" },
		{ value: "exclusion", label: "Exclusion" },
	],
	[
		{ value: "hue", label: "Hue" },
		{ value: "saturation", label: "Saturation" },
		{ value: "color", label: "Color" },
		{ value: "luminosity", label: "Luminosity" },
	],
];

export function BlendingTab({
	element,
	trackId,
}: {
	element: BlendingElement;
	trackId: string;
}) {
	const editor = useEditor();
	const isPreviewActive = useEditor((e) => e.timeline.isPreviewActive());
	const blendMode = element.blendMode ?? DEFAULTS.element.blendMode;
	const committedBlendModeRef = useRef(blendMode);
	if (!isPreviewActive) {
		committedBlendModeRef.current = blendMode;
	}

	const {
		onPointerLeave,
		onOpenChange: handleBlendModeOpenChange,
		markCommitted,
	} = useMenuPreview();

	const previewBlendMode = ({ value }: { value: BlendMode }) =>
		editor.timeline.previewElements({
			updates: [
				{ trackId, elementId: element.id, updates: { blendMode: value } },
			],
		});

	const commitBlendMode = (value: BlendMode) => {
		if (editor.timeline.isPreviewActive()) {
			editor.timeline.commitPreview();
		} else {
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						patch: { blendMode: value },
					},
				],
			});
		}
		markCommitted();
	};

	const { localTime, isPlayheadWithinElementRange } = useElementPlayhead({
		startTime: element.startTime,
		duration: element.duration,
	});
	const resolvedOpacity = resolveOpacityAtTime({
		baseOpacity: element.opacity,
		animations: element.animations,
		localTime,
	});

	const opacity = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "opacity",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: Math.round(resolvedOpacity * 100).toString(),
		parse: (input) => {
			const parsed = parseFloat(input);
			if (Number.isNaN(parsed)) return null;
			return clamp({ value: parsed, min: 0, max: 100 }) / 100;
		},
		valueAtPlayhead: resolvedOpacity,
		step: 0.01,
		buildBaseUpdates: ({ value }) => ({ opacity: value }),
	});

	return (
		<Section collapsible sectionKey={`${element.id}:blending`}>
			<SectionHeader>
				<SectionTitle>Blending</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<div className="flex items-start gap-2">
					<SectionField
						label="Opacity"
						className="w-1/2"
						beforeLabel={
							<KeyframeToggle
								isActive={opacity.isKeyframedAtTime}
								isDisabled={!isPlayheadWithinElementRange}
								title="Toggle opacity keyframe"
								onToggle={opacity.toggleKeyframe}
							/>
						}
					>
						<NumberField
							className="w-full"
							icon={
								<OcCheckerboardIcon className="size-3.5 text-muted-foreground" />
							}
							value={opacity.displayValue}
							min={0}
							max={100}
							onFocus={opacity.onFocus}
							onChange={opacity.onChange}
							onBlur={opacity.onBlur}
							onScrub={opacity.scrubTo}
							onScrubEnd={opacity.commitScrub}
							onReset={() =>
								opacity.commitValue({ value: DEFAULTS.element.opacity })
							}
							isDefault={isPropertyAtDefault({
								hasAnimatedKeyframes: opacity.hasAnimatedKeyframes,
								isPlayheadWithinElementRange,
								resolvedValue: resolvedOpacity,
								staticValue: element.opacity,
								defaultValue: DEFAULTS.element.opacity,
							})}
							dragSensitivity="slow"
						/>
					</SectionField>
					<SectionField label="Blend mode" className="w-1/2">
						<Select
							value={committedBlendModeRef.current}
							onOpenChange={handleBlendModeOpenChange}
							onValueChange={commitBlendMode}
						>
							<SelectTrigger
								icon={<HugeiconsIcon icon={RainDropIcon} />}
								className="w-full"
							>
								<SelectValue placeholder="Select blend mode" />
							</SelectTrigger>
							<SelectContent className="w-36" onPointerLeave={onPointerLeave}>
								{BLEND_MODE_GROUPS.map((group, groupIndex) => (
									<Fragment key={group[0]?.value ?? `group-${groupIndex}`}>
										{group.map((option) => (
											<SelectItem
												key={option.value}
												value={option.value}
												onPointerEnter={() =>
													previewBlendMode({ value: option.value })
												}
											>
												{option.label}
											</SelectItem>
										))}
										{groupIndex < BLEND_MODE_GROUPS.length - 1 ? (
											<SelectSeparator />
										) : null}
									</Fragment>
								))}
							</SelectContent>
						</Select>
					</SectionField>
				</div>
			</SectionContent>
		</Section>
	);
}

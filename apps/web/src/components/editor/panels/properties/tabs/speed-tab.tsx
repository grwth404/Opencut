import { useRef } from "react";
import { useEditor } from "@/hooks/use-editor";
import { NumberField } from "@/components/ui/number-field";
import { Switch } from "@/components/ui/switch";
import { HugeiconsIcon } from "@hugeicons/react";
import { DashboardSpeed02Icon } from "@hugeicons/core-free-icons";
import { buildConstantRetime } from "@/lib/retime";
import {
	DEFAULT_RETIME_RATE,
	MIN_RETIME_RATE,
	MAX_RETIME_RATE,
	clampRetimeRate,
	canMaintainPitch,
} from "@/constants/retime-constants";
import type { AudioElement, VideoElement } from "@/lib/timeline";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { usePropertyDraft } from "../hooks/use-property-draft";

function rateToDisplay({ rate }: { rate: number }): string {
	return rate.toFixed(2);
}

function parseSpeedInput({ input }: { input: string }): number | null {
	const parsed = parseFloat(input);
	if (Number.isNaN(parsed)) return null;
	const rounded = Math.round(parsed * 100) / 100;
	return clampRetimeRate({ rate: rounded });
}

function buildRetime({
	rate,
	maintainPitch,
}: {
	rate: number;
	maintainPitch: boolean;
}) {
	if (rate === DEFAULT_RETIME_RATE && !maintainPitch) return undefined;
	return buildConstantRetime({ rate, maintainPitch });
}

export function SpeedTab({
	element,
	trackId,
}: {
	element: AudioElement | VideoElement;
	trackId: string;
}) {
	const editor = useEditor();
	const rate = clampRetimeRate({
		rate: element.retime?.rate ?? DEFAULT_RETIME_RATE,
	});
	const maintainPitchAvailable = canMaintainPitch({ rate });
	const maintainPitch = element.retime?.maintainPitch ?? false;
	const pendingRateRef = useRef(rate);

	const applyRetime = ({
		rate: nextRate,
		maintainPitch: nextMaintainPitch,
		pushHistory = true,
	}: {
		rate: number;
		maintainPitch: boolean;
		pushHistory?: boolean;
	}) => {
		editor.timeline.updateElementRetime({
			trackId,
			elementId: element.id,
			retime: buildRetime({ rate: nextRate, maintainPitch: nextMaintainPitch }),
			pushHistory,
		});
	};

	const speedDraft = usePropertyDraft({
		displayValue: rateToDisplay({ rate }),
		parse: (input) => parseSpeedInput({ input }),
		onPreview: (nextRate) => {
			pendingRateRef.current = nextRate;
			applyRetime({ rate: nextRate, maintainPitch, pushHistory: false });
		},
		onCommit: () => {
			applyRetime({ rate: pendingRateRef.current, maintainPitch });
		},
	});

	return (
		<Section collapsible sectionKey={`${element.id}:speed`}>
			<SectionHeader>
				<SectionTitle>Speed</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<SectionFields>
					<SectionField label="Speed">
						<NumberField
							icon={<HugeiconsIcon icon={DashboardSpeed02Icon} />}
							value={speedDraft.displayValue}
							suffix="x"
							scrubRanges={[
								{ from: 0.01, to: 1, pixelsPerUnit: 160 },
								{ from: 1, to: 5, pixelsPerUnit: 48 },
							]}
							scrubClamp={{ min: MIN_RETIME_RATE, max: MAX_RETIME_RATE }}
							onFocus={() => {
								pendingRateRef.current = rate;
								speedDraft.onFocus();
							}}
							onChange={speedDraft.onChange}
							onBlur={speedDraft.onBlur}
							onScrub={speedDraft.scrubTo}
							onScrubEnd={speedDraft.commitScrub}
							onReset={() =>
								applyRetime({ rate: DEFAULT_RETIME_RATE, maintainPitch })
							}
							isDefault={rate === DEFAULT_RETIME_RATE}
						/>
					</SectionField>
					<div className="flex items-center justify-between">
					<span className="text-sm">Change pitch</span>
					<Switch
						checked={!maintainPitch}
						disabled={!maintainPitchAvailable}
						onCheckedChange={(checked) =>
							applyRetime({ rate, maintainPitch: !checked })
						}
					/>
					</div>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

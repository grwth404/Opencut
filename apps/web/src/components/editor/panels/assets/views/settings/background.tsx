"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import {
	Section,
	SectionContent,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import {
	BLUR_INTENSITY_PRESETS,
	DEFAULT_BLUR_INTENSITY,
	DEFAULT_COLOR,
} from "@/constants/project-constants";
import { patternCraftGradients } from "@/data/colors/pattern-craft";
import { colors } from "@/data/colors/solid";
import { syntaxUIGradients } from "@/data/colors/syntax-ui";
import { useEditor } from "@/hooks/use-editor";
import { effectPreviewService } from "@/services/renderer/effect-preview";
import type { TCanvasSize } from "@/lib/project/types";
import { cn } from "@/utils/ui";

const BlurPreview = memo(
	({
		blur,
		canvasSize,
		isSelected,
		onSelect,
	}: {
		blur: { label: string; value: number };
		canvasSize: TCanvasSize;
		isSelected: boolean;
		onSelect: () => void;
	}) => {
		const canvasRef = useRef<HTMLCanvasElement>(null);
		const { width, height } = canvasSize;

		useEffect(() => {
			const renderPreview = () => {
				if (!canvasRef.current) return;

				effectPreviewService.renderPreview({
					effectType: "blur",
					params: { intensity: blur.value },
					targetCanvas: canvasRef.current,
					uniformDimensions: { width, height },
				});
			};

			renderPreview();
			return effectPreviewService.onPreviewImageReady({ callback: renderPreview });
		}, [blur.value, width, height]);

		return (
			<button
				className={cn(
					"border-foreground/15 hover:border-primary relative aspect-square size-20 cursor-pointer overflow-hidden rounded-sm border",
					isSelected && "border-primary border-2",
				)}
				onClick={onSelect}
				type="button"
				aria-label={`Select ${blur.label} blur`}
			>
				<canvas
					ref={canvasRef}
					className="absolute inset-0 h-full w-full object-cover"
				/>
				<div className="absolute right-1 bottom-1 left-1 text-center">
					<span className="rounded bg-black/50 px-1 text-xs text-white">
						{blur.label}
					</span>
				</div>
			</button>
		);
	},
);

BlurPreview.displayName = "BlurPreview";

const BackgroundPreviews = memo(
	({
		backgrounds,
		currentBackgroundColor,
		isColorBackground,
		onSelect,
		useBackgroundColor = false,
	}: {
		backgrounds: string[];
		currentBackgroundColor: string;
		isColorBackground: boolean;
		onSelect: (bg: string) => void;
		useBackgroundColor?: boolean;
	}) => {
		return useMemo(
			() =>
				backgrounds.map((bg) => (
					<button
						key={bg}
						className={cn(
							"border-foreground/15 hover:border-primary aspect-square size-20 cursor-pointer rounded-sm border",
							isColorBackground &&
								bg === currentBackgroundColor &&
								"border-primary border-2",
						)}
						style={
							useBackgroundColor
								? { backgroundColor: bg }
								: {
										background: bg,
										backgroundSize: "cover",
										backgroundPosition: "center",
										backgroundRepeat: "no-repeat",
									}
						}
						onClick={() => onSelect(bg)}
						type="button"
						aria-label={`Select background ${bg}`}
					/>
				)),
			[
				backgrounds,
				isColorBackground,
				currentBackgroundColor,
				onSelect,
				useBackgroundColor,
			],
		);
	},
);

BackgroundPreviews.displayName = "BackgroundPreviews";

const COLOR_SECTIONS = [
	{ title: "Colors", backgrounds: colors, useBackgroundColor: true },
	{ title: "Pattern craft", backgrounds: patternCraftGradients },
	{ title: "Syntax UI", backgrounds: syntaxUIGradients },
] as const;

export function BackgroundContent() {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());

	const handleBlurSelect = useCallback(
		async (blurIntensity: number) => {
			await editor.project.updateSettings({
				settings: { background: { type: "blur", blurIntensity } },
			});
		},
		[editor.project],
	);

	const handleColorSelect = useCallback(
		async (color: string) => {
			await editor.project.updateSettings({
				settings: { background: { type: "color", color } },
			});
		},
		[editor.project],
	);

	const isBlurBackground = activeProject.settings.background.type === "blur";
	const isColorBackground = activeProject.settings.background.type === "color";

	const currentBlurIntensity = isBlurBackground
		? (activeProject.settings.background as { blurIntensity: number })
				.blurIntensity
		: DEFAULT_BLUR_INTENSITY;

	const currentBackgroundColor = isColorBackground
		? (activeProject.settings.background as { color: string }).color
		: DEFAULT_COLOR;
	const canvasSize = activeProject.settings.canvasSize;

	const blurPreviews = useMemo(
		() =>
			BLUR_INTENSITY_PRESETS.map((blur) => (
				<BlurPreview
					key={blur.value}
					blur={blur}
					canvasSize={canvasSize}
					isSelected={isBlurBackground && currentBlurIntensity === blur.value}
					onSelect={() => handleBlurSelect(blur.value)}
				/>
			)),
		[canvasSize, isBlurBackground, currentBlurIntensity, handleBlurSelect],
	);

	return (
		<div className="flex flex-col">
			<Section collapsible defaultOpen={true} sectionKey="background-blur" showTopBorder={false}>
				<SectionHeader>
					<SectionTitle>Blur</SectionTitle>
				</SectionHeader>
				<SectionContent>
					<div className="flex flex-wrap gap-2">{blurPreviews}</div>
				</SectionContent>
			</Section>
			{COLOR_SECTIONS.map((section) => (
				<Section
					key={section.title}
					collapsible
					defaultOpen={false}
					sectionKey={`settings:background-${section.title.toLowerCase().replace(/\s+/g, "-")}`}
				>
					<SectionHeader>
						<SectionTitle>{section.title}</SectionTitle>
					</SectionHeader>
					<SectionContent>
						<div className="flex flex-wrap gap-2">
							<BackgroundPreviews
								backgrounds={section.backgrounds as string[]}
								currentBackgroundColor={currentBackgroundColor}
								isColorBackground={isColorBackground}
								onSelect={handleColorSelect}
								useBackgroundColor={
									"useBackgroundColor" in section
										? section.useBackgroundColor
										: false
								}
							/>
						</div>
					</SectionContent>
				</Section>
			))}
		</div>
	);
}

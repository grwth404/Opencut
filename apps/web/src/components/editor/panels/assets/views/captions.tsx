import { Button } from "@/components/ui/button";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useState, useRef } from "react";
import { extractTimelineAudio } from "@/lib/media/mediabunny";
import { useEditor } from "@/hooks/use-editor";
import {
	DEFAULT_TRANSCRIPTION_SAMPLE_RATE,
	TRANSCRIPTION_LANGUAGES,
} from "@/constants/transcription-constants";
import type {
	TranscriptionLanguage,
	TranscriptionProgress,
} from "@/lib/transcription/types";
import { transcriptionService } from "@/services/transcription/service";
import { decodeAudioToFloat32 } from "@/lib/media/audio";
import { buildCaptionChunks } from "@/lib/transcription/caption";
import { Spinner } from "@/components/ui/spinner";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
} from "@/components/section";
import { DEFAULTS } from "@/lib/timeline/defaults";
import {
	AddTrackCommand,
	BatchCommand,
	InsertElementCommand,
} from "@/lib/commands";

export function Captions() {
	const [selectedLanguage, setSelectedLanguage] =
		useState<TranscriptionLanguage>("auto");
	const [isProcessing, setIsProcessing] = useState(false);
	const [processingStep, setProcessingStep] = useState("");
	const [error, setError] = useState<string | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const editor = useEditor();

	const handleProgress = (progress: TranscriptionProgress) => {
		if (progress.status === "loading-model") {
			setProcessingStep(`Loading model ${Math.round(progress.progress)}%`);
		} else if (progress.status === "transcribing") {
			setProcessingStep("Transcribing...");
		}
	};

	const handleGenerateTranscript = async () => {
		try {
			setIsProcessing(true);
			setError(null);
			setProcessingStep("Extracting audio...");

			const audioBlob = await extractTimelineAudio({
				tracks: editor.scenes.getActiveScene().tracks,
				mediaAssets: editor.media.getAssets(),
				totalDuration: editor.timeline.getTotalDuration(),
			});

			setProcessingStep("Preparing audio...");
			const { samples } = await decodeAudioToFloat32({
				audioBlob,
				sampleRate: DEFAULT_TRANSCRIPTION_SAMPLE_RATE,
			});

			const result = await transcriptionService.transcribe({
				audioData: samples,
				language: selectedLanguage === "auto" ? undefined : selectedLanguage,
				onProgress: handleProgress,
			});

			setProcessingStep("Generating captions...");
			const captionChunks = buildCaptionChunks({ segments: result.segments });

			const addTrackCommand = new AddTrackCommand("text", 0);
			const insertCommands = captionChunks.map(
				(caption, i) =>
					new InsertElementCommand({
						placement: {
							mode: "explicit",
							trackId: addTrackCommand.getTrackId(),
						},
						element: {
							...DEFAULTS.text.element,
							name: `Caption ${i + 1}`,
							content: caption.text,
							duration: caption.duration,
							startTime: caption.startTime,
							fontSize: 65,
							fontWeight: "bold",
						},
					}),
			);

			editor.command.execute({
				command: new BatchCommand([addTrackCommand, ...insertCommands]),
			});
		} catch (error) {
			console.error("Transcription failed:", error);
			setError(
				error instanceof Error ? error.message : "An unexpected error occurred",
			);
		} finally {
			setIsProcessing(false);
			setProcessingStep("");
		}
	};

	const handleLanguageChange = ({ value }: { value: string }) => {
		if (value === "auto") {
			setSelectedLanguage("auto");
			return;
		}

		const matchedLanguage = TRANSCRIPTION_LANGUAGES.find(
			(language) => language.code === value,
		);
		if (!matchedLanguage) return;
		setSelectedLanguage(matchedLanguage.code);
	};

	return (
		<PanelView
			title="Captions"
			contentClassName="px-0 flex flex-col h-full"
			ref={containerRef}
		>
			<Section showTopBorder={false} showBottomBorder={false} className="flex-1">
				<SectionContent className="flex flex-col gap-4 h-full pt-1">
					<SectionFields>
						<SectionField label="Language">
							<Select
								value={selectedLanguage}
								onValueChange={(value) => handleLanguageChange({ value })}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select a language" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="auto">Auto detect</SelectItem>
									{TRANSCRIPTION_LANGUAGES.map((language) => (
										<SelectItem key={language.code} value={language.code}>
											{language.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</SectionField>
					</SectionFields>

					{error && (
						<div className="bg-destructive/10 border-destructive/20 rounded-md border p-3">
							<p className="text-destructive text-sm">{error}</p>
						</div>
					)}
				</SectionContent>
			</Section>
			<Section showBottomBorder={false} showTopBorder={false}>
				<SectionContent>
					<Button
						className="w-full"
						onClick={handleGenerateTranscript}
						disabled={isProcessing}
					>
						{isProcessing && <Spinner className="mr-1" />}
						{isProcessing ? processingStep : "Generate transcript"}
					</Button>
				</SectionContent>
			</Section>
		</PanelView>
	);
}

import { buildGaussianBlurPasses, intensityToSigma } from "@/lib/effects/definitions/blur";
import { mediaTimeToSeconds } from "opencut-wasm";
import { getSourceTimeAtClipTime } from "@/lib/retime";
import { videoCache } from "@/services/video-cache/service";
import type { RetimeConfig } from "@/lib/timeline";
import type { CanvasRenderer } from "../canvas-renderer";
import { createOffscreenCanvas } from "../canvas-utils";
import { gpuRenderer } from "../gpu-renderer";
import { BaseNode } from "./base-node";
import { loadImageSource, type CachedImageSource } from "./image-node";

export type BlurBackgroundNodeParams = {
	mediaId: string;
	url: string;
	file: File;
	mediaType: "video" | "image";
	duration: number;
	timeOffset: number;
	trimStart: number;
	trimEnd: number;
	retime?: RetimeConfig;
	blurIntensity: number;
};

type BackdropSource = {
	source: CanvasImageSource;
	width: number;
	height: number;
};

export class BlurBackgroundNode extends BaseNode<BlurBackgroundNodeParams> {
	private cachedImageSource: Promise<CachedImageSource> | null;

	constructor(params: BlurBackgroundNodeParams) {
		super(params);
		this.cachedImageSource =
			params.mediaType === "image" ? loadImageSource(params.url) : null;
	}

	private isInRange({ time }: { time: number }): boolean {
		const localTime = time - this.params.timeOffset;
		return localTime >= 0 && localTime < this.params.duration;
	}

	private getSourceLocalTime({ time }: { time: number }): number {
		const clipTime = time - this.params.timeOffset;
		return (
			this.params.trimStart +
			getSourceTimeAtClipTime({
				clipTime,
				retime: this.params.retime,
			})
		);
	}

	private async getBackdropSource({
		time,
	}: {
		time: number;
	}): Promise<BackdropSource | null> {
		if (this.params.mediaType === "video") {
			const sourceTimeTicks = this.getSourceLocalTime({ time });
			const frame = await videoCache.getFrameAt({
				mediaId: this.params.mediaId,
				file: this.params.file,
				time: mediaTimeToSeconds({ time: sourceTimeTicks }),
			});

			if (!frame) {
				return null;
			}

			return {
				source: frame.canvas,
				width: frame.canvas.width,
				height: frame.canvas.height,
			};
		}

		if (!this.cachedImageSource) {
			return null;
		}

		const { source, width, height } = await this.cachedImageSource;
		return { source, width, height };
	}

	async render({ renderer, time }: { renderer: CanvasRenderer; time: number }) {
		await super.render({ renderer, time });

		if (!this.isInRange({ time })) {
			return;
		}

		const backdropSource = await this.getBackdropSource({ time });
		if (!backdropSource) {
			return;
		}

		const offscreen = createOffscreenCanvas({
			width: renderer.width,
			height: renderer.height,
		});
		const offscreenCtx = offscreen.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (!offscreenCtx) {
			return;
		}

		const coverScale = Math.max(
			renderer.width / backdropSource.width,
			renderer.height / backdropSource.height,
		);
		const scaledWidth = backdropSource.width * coverScale;
		const scaledHeight = backdropSource.height * coverScale;
		const offsetX = (renderer.width - scaledWidth) / 2;
		const offsetY = (renderer.height - scaledHeight) / 2;

		offscreenCtx.drawImage(
			backdropSource.source,
			offsetX,
			offsetY,
			scaledWidth,
			scaledHeight,
		);

		const passes = buildGaussianBlurPasses({
			sigmaX: intensityToSigma({ intensity: this.params.blurIntensity, resolution: renderer.width, reference: 1920 }),
			sigmaY: intensityToSigma({ intensity: this.params.blurIntensity, resolution: renderer.height, reference: 1080 }),
		});
		const effectResult = gpuRenderer.applyEffect({
			source: offscreen as CanvasImageSource,
			width: renderer.width,
			height: renderer.height,
			passes,
		});

		renderer.context.drawImage(
			effectResult,
			0,
			0,
			renderer.width,
			renderer.height,
		);
	}
}

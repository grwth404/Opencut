import type { EditorCore } from "@/core";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { roundToFrame } from "opencut-wasm";

export class PlaybackManager {
	private isPlaying = false;
	private currentTime = 0;
	private volume = 1;
	private muted = false;
	private previousVolume = 1;
	private isScrubbing = false;
	private listeners = new Set<() => void>();
	private playbackTimer: number | null = null;
	private playbackStartWallTime = 0;
	private playbackStartTime = 0;

	constructor(private editor: EditorCore) {
		this.editor.timeline.subscribe(() => {
			const maxTime = this.editor.timeline.getTotalDuration();
			if (this.currentTime > maxTime && maxTime > 0) {
				this.currentTime = maxTime;
				this.notify();
			}
		});
	}

	play(): void {
		const maxTime = this.editor.timeline.getTotalDuration();

		if (maxTime > 0) {
			if (this.currentTime >= maxTime) {
				this.seek({ time: 0 });
			}
		}

		this.isPlaying = true;
		this.startTimer();
		this.notify();
	}

	pause(): void {
		this.isPlaying = false;
		this.stopTimer();
		this.notify();
	}

	toggle(): void {
		if (this.isPlaying) {
			this.pause();
		} else {
			this.play();
		}
	}

	seek({ time }: { time: number }): void {
		const maxTime = this.editor.timeline.getTotalDuration();
		this.currentTime = Math.max(0, Math.min(maxTime, time));
		if (this.isPlaying) {
			this.playbackStartWallTime = performance.now();
			this.playbackStartTime = this.currentTime;
		}
		this.notify();

		window.dispatchEvent(
			new CustomEvent("playback-seek", {
				detail: { time: this.currentTime },
			}),
		);
	}

	setVolume({ volume }: { volume: number }): void {
		const clampedVolume = Math.max(0, Math.min(1, volume));
		this.volume = clampedVolume;
		this.muted = clampedVolume === 0;
		if (clampedVolume > 0) {
			this.previousVolume = clampedVolume;
		}
		this.notify();
	}

	mute(): void {
		if (this.volume > 0) {
			this.previousVolume = this.volume;
		}
		this.muted = true;
		this.volume = 0;
		this.notify();
	}

	unmute(): void {
		this.muted = false;
		this.volume = this.previousVolume;
		this.notify();
	}

	toggleMute(): void {
		if (this.muted) {
			this.unmute();
		} else {
			this.mute();
		}
	}

	getIsPlaying(): boolean {
		return this.isPlaying;
	}

	getCurrentTime(): number {
		return this.currentTime;
	}

	getVolume(): number {
		return this.volume;
	}

	isMuted(): boolean {
		return this.muted;
	}

	setScrubbing({ isScrubbing }: { isScrubbing: boolean }): void {
		this.isScrubbing = isScrubbing;
		this.notify();
	}

	getIsScrubbing(): boolean {
		return this.isScrubbing;
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		this.listeners.forEach((fn) => {
			fn();
		});
	}

	private startTimer(): void {
		if (this.playbackTimer) {
			cancelAnimationFrame(this.playbackTimer);
		}

		this.playbackStartWallTime = performance.now();
		this.playbackStartTime = this.currentTime;
		this.updateTime();
	}

	private stopTimer(): void {
		if (this.playbackTimer) {
			cancelAnimationFrame(this.playbackTimer);
			this.playbackTimer = null;
		}
	}

	private updateTime = (): void => {
		if (!this.isPlaying) return;

		const fps = this.editor.project.getActive()?.settings.fps;
		const elapsedSeconds = (performance.now() - this.playbackStartWallTime) / 1000;
		const rawTime = this.playbackStartTime + Math.round(elapsedSeconds * TICKS_PER_SECOND);
		const newTime = fps ? (roundToFrame({ time: rawTime, rate: fps }) ?? rawTime) : rawTime;
		const maxTime = this.editor.timeline.getTotalDuration();

		if (maxTime > 0 && newTime >= maxTime) {
			this.pause();
			this.currentTime = maxTime;
			this.notify();

			window.dispatchEvent(
				new CustomEvent("playback-seek", {
					detail: { time: maxTime },
				}),
			);
		} else {
			this.currentTime = newTime;

			window.dispatchEvent(
				new CustomEvent("playback-update", {
					detail: { time: newTime },
				}),
			);
		}

		this.playbackTimer = requestAnimationFrame(this.updateTime);
	};
}

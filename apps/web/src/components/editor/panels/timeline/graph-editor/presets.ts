"use client";

import { useSyncExternalStore } from "react";
import type { NormalizedCubicBezier } from "@/lib/animation/types";

const STORAGE_KEY = "opencut:graph-editor-presets";
export const PRESET_MATCH_TOLERANCE = 0.02;

export interface EasingPreset {
	id: string;
	label: string;
	value: NormalizedCubicBezier;
	isCustom?: boolean;
}

export const BUILTIN_PRESETS: EasingPreset[] = [
	{ id: "smooth", label: "Smooth", value: [0.25, 0.1, 0.25, 1] },
	{ id: "ease-out", label: "Ease out", value: [0, 0, 0.2, 1] },
	{ id: "ease-in", label: "Ease in", value: [0.8, 0, 1, 1] },
	{ id: "ease-in-out", label: "In out", value: [0.4, 0, 0.2, 1] },
	{ id: "pop", label: "Pop", value: [0.175, 0.885, 0.32, 1.275] },
	{ id: "linear", label: "Linear", value: [0, 0, 1, 1] },
];

let cachedPresets: EasingPreset[] | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): EasingPreset[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		// JSON.parse can throw if the stored value is corrupted
		return raw ? (JSON.parse(raw) as EasingPreset[]) : [];
	} catch {
		return [];
	}
}

function writeToStorage(presets: EasingPreset[]): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function getSnapshot(): EasingPreset[] {
	cachedPresets ??= readFromStorage();
	return cachedPresets;
}

function getServerSnapshot(): EasingPreset[] {
	return [];
}

function notify(): void {
	cachedPresets = null;
	for (const listener of listeners) {
		listener();
	}
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

if (typeof window !== "undefined") {
	window.addEventListener("storage", (event) => {
		if (event.key === STORAGE_KEY) notify();
	});
}

export function useCustomPresets(): EasingPreset[] {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function savePreset(value: NormalizedCubicBezier): void {
	const current = getSnapshot();
	writeToStorage([
		...current,
		{
			id: `custom-${Date.now()}`,
			label: `Custom ${current.length + 1}`,
			value,
			isCustom: true,
		},
	]);
	notify();
}

export function removePreset(id: string): void {
	writeToStorage(getSnapshot().filter((preset) => preset.id !== id));
	notify();
}

import { converter, formatHex, formatHex8, parse } from "culori";
import type {
	AnimationBindingComponent,
	AnimationBindingOfKind,
	AnimationBindingInstance,
	AnimationBindingKind,
	ColorAnimationBinding,
	DiscreteAnimationBinding,
	NumberAnimationBinding,
	AnimationPath,
	AnimationValue,
	DiscreteValue,
	Vector2AnimationBinding,
	VectorValue,
} from "@/lib/animation/types";
import { clamp } from "@/utils/math";

interface LinearRgba {
	r: number;
	g: number;
	b: number;
	a: number;
}

export type AnimationComponentValue = number | DiscreteValue;

const toRgb = converter("rgb");

function srgbToLinear({ value }: { value: number }): number {
	return value <= 0.04045
		? value / 12.92
		: Math.pow((value + 0.055) / 1.055, 2.4);
}

function linearToSrgb({ value }: { value: number }): number {
	const clamped = clamp({ value, min: 0, max: 1 });
	return clamped <= 0.0031308
		? clamped * 12.92
		: 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export function isVectorValue(value: unknown): value is VectorValue {
	return isRecord(value) && typeof value.x === "number" && typeof value.y === "number";
}

export type EasingMode = "independent" | "shared";

/**
 * Declares how easing curves apply to a binding's components.
 * "shared" means all components always use the same curve (e.g. color — you never
 * want to ease R independently from G/B/A). "independent" means each component
 * can have its own curve.
 */
export function getEasingModeForKind(kind: AnimationBindingKind): EasingMode {
	return kind === "color" ? "shared" : "independent";
}

export function getBindingComponentKeys({
	kind,
}: {
	kind: AnimationBindingKind;
}): string[] {
	if (kind === "vector2") {
		return ["x", "y"];
	}

	if (kind === "color") {
		return ["r", "g", "b", "a"];
	}

	return ["value"];
}

export function buildBindingChannelId({
	path,
	componentKey,
}: {
	path: AnimationPath;
	componentKey: string;
}): string {
	return `${path}:${componentKey}`;
}

function createBindingComponent<TKey extends string>({
	path,
	key,
}: {
	path: AnimationPath;
	key: TKey;
}): AnimationBindingComponent<TKey> {
	return {
		key,
		channelId: buildBindingChannelId({ path, componentKey: key }),
	};
}

function cloneBindingComponents<TKey extends string>({
	components,
}: {
	components: AnimationBindingComponent<TKey>[];
}): AnimationBindingComponent<TKey>[] {
	return components.map((component) => ({ ...component }));
}

const animationBindingFactories = {
	color: ({ path }: { path: AnimationPath }): ColorAnimationBinding => ({
		path,
		kind: "color",
		colorSpace: "srgb-linear",
		components: [
			createBindingComponent({ path, key: "r" }),
			createBindingComponent({ path, key: "g" }),
			createBindingComponent({ path, key: "b" }),
			createBindingComponent({ path, key: "a" }),
		],
	}),
	vector2: ({ path }: { path: AnimationPath }): Vector2AnimationBinding => ({
		path,
		kind: "vector2",
		components: [
			createBindingComponent({ path, key: "x" }),
			createBindingComponent({ path, key: "y" }),
		],
	}),
	number: ({ path }: { path: AnimationPath }): NumberAnimationBinding => ({
		path,
		kind: "number",
		components: [createBindingComponent({ path, key: "value" })],
	}),
	discrete: ({ path }: { path: AnimationPath }): DiscreteAnimationBinding => ({
		path,
		kind: "discrete",
		components: [createBindingComponent({ path, key: "value" })],
	}),
} satisfies {
	[K in AnimationBindingKind]: ({
		path,
	}: {
		path: AnimationPath;
	}) => AnimationBindingOfKind<K>;
};

export function createAnimationBinding<TKind extends AnimationBindingKind>({
	path,
	kind,
}: {
	path: AnimationPath;
	kind: TKind;
}): AnimationBindingOfKind<TKind>;
export function createAnimationBinding({
	path,
	kind,
}: {
	path: AnimationPath;
	kind: AnimationBindingKind;
}): AnimationBindingInstance {
	return animationBindingFactories[kind]({ path });
}

const animationBindingCloners = {
	color: ({ binding }: { binding: ColorAnimationBinding }): ColorAnimationBinding => ({
		...binding,
		components: cloneBindingComponents({
			components: binding.components,
		}),
	}),
	vector2: ({
		binding,
	}: {
		binding: Vector2AnimationBinding;
	}): Vector2AnimationBinding => ({
		...binding,
		components: cloneBindingComponents({
			components: binding.components,
		}),
	}),
	number: ({
		binding,
	}: {
		binding: NumberAnimationBinding;
	}): NumberAnimationBinding => ({
		...binding,
		components: cloneBindingComponents({
			components: binding.components,
		}),
	}),
	discrete: ({
		binding,
	}: {
		binding: DiscreteAnimationBinding;
	}): DiscreteAnimationBinding => ({
		...binding,
		components: cloneBindingComponents({
			components: binding.components,
		}),
	}),
} satisfies {
	[K in AnimationBindingKind]: ({
		binding,
	}: {
		binding: AnimationBindingOfKind<K>;
	}) => AnimationBindingOfKind<K>;
};

export function cloneAnimationBinding<TKind extends AnimationBindingKind>({
	binding,
}: {
	binding: AnimationBindingOfKind<TKind>;
}): AnimationBindingOfKind<TKind>;
export function cloneAnimationBinding({
	binding,
}: {
	binding: AnimationBindingInstance;
}): AnimationBindingInstance {
	switch (binding.kind) {
		case "color":
			return animationBindingCloners.color({ binding });
		case "vector2":
			return animationBindingCloners.vector2({ binding });
		case "number":
			return animationBindingCloners.number({ binding });
		case "discrete":
			return animationBindingCloners.discrete({ binding });
	}
}

export function parseColorToLinearRgba({
	color,
}: {
	color: string;
}): LinearRgba | null {
	const parsed = parse(color);
	const rgb = parsed ? toRgb(parsed) : null;
	if (!rgb) {
		return null;
	}

	return {
		r: srgbToLinear({ value: rgb.r ?? 0 }),
		g: srgbToLinear({ value: rgb.g ?? 0 }),
		b: srgbToLinear({ value: rgb.b ?? 0 }),
		a: clamp({ value: rgb.alpha ?? 1, min: 0, max: 1 }),
	};
}

export function formatLinearRgba({
	color,
}: {
	color: LinearRgba;
}): string {
	const rgb = {
		mode: "rgb",
		r: linearToSrgb({ value: color.r }),
		g: linearToSrgb({ value: color.g }),
		b: linearToSrgb({ value: color.b }),
		alpha: clamp({ value: color.a, min: 0, max: 1 }),
	} as const;
	return rgb.alpha < 1 ? formatHex8(rgb) : formatHex(rgb);
}

export function decomposeAnimationValue({
	kind,
	value,
}: {
	kind: AnimationBindingKind;
	value: AnimationValue;
}): Record<string, AnimationComponentValue> | null {
	if (kind === "number") {
		return typeof value === "number" ? { value } : null;
	}

	if (kind === "vector2") {
		return isVectorValue(value) ? { x: value.x, y: value.y } : null;
	}

	if (kind === "color") {
		if (typeof value !== "string") {
			return null;
		}
		const parsed = parseColorToLinearRgba({ color: value });
		if (!parsed) {
			return null;
		}
		return {
			r: parsed.r,
			g: parsed.g,
			b: parsed.b,
			a: parsed.a,
		};
	}

	return typeof value === "string" || typeof value === "boolean"
		? { value }
		: null;
}

export function composeAnimationValue({
	binding,
	componentValues,
}: {
	binding: AnimationBindingInstance;
	componentValues: Record<string, AnimationComponentValue | undefined>;
}): AnimationValue | null {
	if (binding.kind === "number") {
		const value = componentValues.value;
		return typeof value === "number" ? value : null;
	}

	if (binding.kind === "vector2") {
		const x = componentValues.x;
		const y = componentValues.y;
		return typeof x === "number" && typeof y === "number" ? { x, y } : null;
	}

	if (binding.kind === "color") {
		const r = componentValues.r;
		const g = componentValues.g;
		const b = componentValues.b;
		const a = componentValues.a;
		if (
			typeof r !== "number" ||
			typeof g !== "number" ||
			typeof b !== "number" ||
			typeof a !== "number"
		) {
			return null;
		}
		return formatLinearRgba({
			color: {
				r,
				g,
				b,
				a,
			},
		});
	}

	const value = componentValues.value;
	return typeof value === "string" || typeof value === "boolean" ? value : null;
}

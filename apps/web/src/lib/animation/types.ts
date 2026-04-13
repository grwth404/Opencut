import type { ParamValues } from "@/lib/params";

export const ANIMATION_PROPERTY_PATHS = [
	"transform.positionX",
	"transform.positionY",
	"transform.scaleX",
	"transform.scaleY",
	"transform.rotate",
	"opacity",
	"volume",
	"color",
	"background.color",
	"background.paddingX",
	"background.paddingY",
	"background.offsetX",
	"background.offsetY",
	"background.cornerRadius",
] as const;

export type AnimationPropertyPath = (typeof ANIMATION_PROPERTY_PATHS)[number];
export type GraphicParamPath = `params.${string}`;
export type EffectParamPath = `effects.${string}.params.${string}`;
export type AnimationPath =
	| AnimationPropertyPath
	| GraphicParamPath
	| EffectParamPath;

export const ANIMATION_PROPERTY_GROUPS = {
	"transform.scale": ["transform.scaleX", "transform.scaleY"],
} as const satisfies Record<string, ReadonlyArray<AnimationPropertyPath>>;

export type AnimationPropertyGroup = keyof typeof ANIMATION_PROPERTY_GROUPS;

export type VectorValue = { x: number; y: number };
export type DiscreteValue = boolean | string;
export type AnimationValue = number | string | boolean | VectorValue;
export interface AnimationPropertyValueMap {
	"transform.positionX": number;
	"transform.positionY": number;
	"transform.scaleX": number;
	"transform.scaleY": number;
	"transform.rotate": number;
	opacity: number;
	volume: number;
	color: string;
	"background.color": string;
	"background.paddingX": number;
	"background.paddingY": number;
	"background.offsetX": number;
	"background.offsetY": number;
	"background.cornerRadius": number;
}
export type DynamicAnimationPathValue = ParamValues[string];
export type AnimationValueForPath<TPath extends AnimationPath> =
	TPath extends AnimationPropertyPath
		? AnimationPropertyValueMap[TPath]
		: TPath extends GraphicParamPath | EffectParamPath
			? DynamicAnimationPathValue
			: never;
export type AnimationNumericPropertyPath = {
	[K in AnimationPropertyPath]: AnimationValueForPath<K> extends number ? K : never;
}[AnimationPropertyPath];
export type AnimationColorPropertyPath = {
	[K in AnimationPropertyPath]: AnimationValueForPath<K> extends string ? K : never;
}[AnimationPropertyPath];

export type ContinuousKeyframeInterpolation = "linear" | "hold" | "bezier";
export type DiscreteKeyframeInterpolation = "hold";
export type AnimationInterpolation =
	| ContinuousKeyframeInterpolation
	| DiscreteKeyframeInterpolation;

export type PrimitiveAnimationChannelKind = "scalar" | "discrete";
export type AnimationBindingKind = "number" | "vector2" | "color" | "discrete";
export type ScalarSegmentType = "step" | "linear" | "bezier";
export type TangentMode = "auto" | "aligned" | "broken" | "flat";
export type ChannelExtrapolationMode = "hold" | "linear";

export interface CurveHandle {
	dt: number;
	dv: number;
}

interface BaseAnimationKeyframe<TValue extends number | DiscreteValue> {
	id: string;
	time: number; // relative to element start time
	value: TValue;
}

export interface ScalarAnimationKey extends BaseAnimationKeyframe<number> {
	leftHandle?: CurveHandle;
	rightHandle?: CurveHandle;
	segmentToNext: ScalarSegmentType;
	tangentMode: TangentMode;
}

export interface DiscreteAnimationKey
	extends BaseAnimationKeyframe<DiscreteValue> {}

export type AnimationKeyframe = ScalarAnimationKey | DiscreteAnimationKey;

export interface ScalarAnimationChannel {
	kind: "scalar";
	keys: ScalarAnimationKey[];
	extrapolation?: {
		before: ChannelExtrapolationMode;
		after: ChannelExtrapolationMode;
	};
}

export interface DiscreteAnimationChannel {
	kind: "discrete";
	keys: DiscreteAnimationKey[];
}

export type AnimationChannel =
	| ScalarAnimationChannel
	| DiscreteAnimationChannel;

export type ElementAnimationChannelMap = Record<
	string,
	AnimationChannel | undefined
>;

export interface AnimationBindingComponent<TKey extends string = string> {
	key: TKey;
	channelId: string;
}

interface BaseAnimationBinding<
	TKind extends AnimationBindingKind,
	TComponentKey extends string,
> {
	path: AnimationPath;
	kind: TKind;
	components: AnimationBindingComponent<TComponentKey>[];
}

export interface NumberAnimationBinding
	extends BaseAnimationBinding<"number", "value"> {}

export interface Vector2AnimationBinding
	extends BaseAnimationBinding<"vector2", "x" | "y"> {}

export interface ColorAnimationBinding
	extends BaseAnimationBinding<"color", "r" | "g" | "b" | "a"> {
	colorSpace: "srgb-linear";
}

export interface DiscreteAnimationBinding
	extends BaseAnimationBinding<"discrete", "value"> {}

export type AnimationBindingInstance =
	| NumberAnimationBinding
	| Vector2AnimationBinding
	| ColorAnimationBinding
	| DiscreteAnimationBinding;

export interface AnimationBindingByKind {
	number: NumberAnimationBinding;
	vector2: Vector2AnimationBinding;
	color: ColorAnimationBinding;
	discrete: DiscreteAnimationBinding;
}

export type AnimationBindingOfKind<TKind extends AnimationBindingKind> =
	AnimationBindingByKind[TKind];

export type ElementAnimationBindingMap = Record<
	string,
	AnimationBindingInstance | undefined
>;

export interface ElementAnimations {
	bindings: ElementAnimationBindingMap;
	channels: ElementAnimationChannelMap;
}

export type NormalizedCubicBezier = [number, number, number, number];

export interface ScalarGraphChannelTarget {
	propertyPath: AnimationPath;
	componentKey: string;
	channelId: string;
}

export interface ScalarGraphChannel extends ScalarGraphChannelTarget {
	channel: ScalarAnimationChannel;
}

export interface ScalarGraphKeyframeRef extends ScalarGraphChannelTarget {
	keyframeId: string;
}

export interface ScalarGraphKeyframeContext extends ScalarGraphChannel {
	keyframe: ScalarAnimationKey;
	keyframeIndex: number;
	previousKey: ScalarAnimationKey | null;
	nextKey: ScalarAnimationKey | null;
}

export interface ScalarCurveKeyframePatch {
	leftHandle?: CurveHandle | null;
	rightHandle?: CurveHandle | null;
	segmentToNext?: ScalarSegmentType;
	tangentMode?: TangentMode;
}

export interface ElementKeyframe {
	propertyPath: AnimationPath;
	id: string;
	time: number;
	value: AnimationValue;
	interpolation: AnimationInterpolation;
}

export interface SelectedKeyframeRef {
	trackId: string;
	elementId: string;
	propertyPath: AnimationPath;
	keyframeId: string;
}

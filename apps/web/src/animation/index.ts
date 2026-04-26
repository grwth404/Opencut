export {
	getChannelValueAtTime,
	getDiscreteChannelValueAtTime,
	getScalarChannelValueAtTime,
	getScalarSegmentInterpolation,
	normalizeChannel,
} from "./interpolation";

export {
	clampAnimationsToDuration,
	cloneAnimations,
	getChannel,
	removeElementKeyframe,
	retimeElementKeyframe,
	setBindingComponentChannel,
	setChannel,
	splitAnimationsAtTime,
	updateScalarKeyframeCurve,
	upsertElementKeyframe,
	upsertPathKeyframe,
} from "./keyframes";

export {
	getElementLocalTime,
	resolveAnimationPathValueAtTime,
} from "./resolve";

export {
	getElementKeyframes,
	getKeyframeById,
	getKeyframeAtTime,
	hasKeyframesForPath,
} from "./keyframe-query";

export {
	type EditableScalarChannels,
	getEditableScalarChannel,
	getEditableScalarChannels,
	getScalarKeyframeContext,
} from "./graph-channels";

export {
	getCurveHandlesForNormalizedCubicBezier,
	getNormalizedCubicBezierForScalarSegment,
} from "./curve-bridge";

export {
	buildGraphicParamPath,
	isGraphicParamPath,
	parseGraphicParamPath,
	resolveGraphicParamsAtTime,
} from "./graphic-param-channel";

export {
	buildEffectParamPath,
	isEffectParamPath,
	parseEffectParamPath,
	removeEffectParamKeyframe,
	resolveEffectParamsAtTime,
} from "./effect-param-channel";

export {
	getGroupKeyframesAtTime,
	hasGroupKeyframeAtTime,
	type GroupKeyframeRef,
} from "./property-groups";

export {
	type EasingMode,
	getEasingModeForKind,
} from "./binding-values";

export {
	isAnimationPath,
	isAnimationPropertyPath,
} from "./path";

export {
	coerceAnimationValueForProperty,
	getAnimationPropertyDefinition,
	getDefaultInterpolationForProperty,
	getElementBaseValueForProperty,
	supportsAnimationProperty,
	type AnimationPropertyDefinition,
	type NumericSpec,
	withElementBaseValueForProperty,
} from "./property-registry";

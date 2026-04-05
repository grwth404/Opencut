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
	resolveColorAtTime,
	resolveNumberAtTime,
	resolveOpacityAtTime,
	resolveTransformAtTime,
} from "./resolve";

export {
	coerceAnimationValueForProperty,
	getAnimationPropertyDefinition,
	getDefaultInterpolationForProperty,
	getElementBaseValueForProperty,
	isAnimationPropertyPath,
	supportsAnimationProperty,
	type AnimationPropertyDefinition,
	type NumericSpec,
	withElementBaseValueForProperty,
} from "./property-registry";

export {
	getElementKeyframes,
	getKeyframeById,
	getKeyframeAtTime,
	hasKeyframesForPath,
} from "./keyframe-query";

export {
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
	isAnimationPath,
	coerceAnimationValueForParam,
	resolveAnimationTarget,
	getParamValueKind,
	getParamDefaultInterpolation,
	type AnimationPathDescriptor,
} from "./target-resolver";

export {
	getGroupKeyframesAtTime,
	hasGroupKeyframeAtTime,
	type GroupKeyframeRef,
} from "./property-groups";

export {
	isVectorValue,
} from "./binding-values";

import type {
	AnimationBindingInstance,
	AnimationPath,
	ElementAnimations,
	ScalarAnimationChannel,
	ScalarGraphChannel,
	ScalarGraphKeyframeContext,
} from "@/animation/types";

export interface EditableScalarChannels {
	binding: AnimationBindingInstance;
	channels: ScalarGraphChannel[];
}

function isScalarAnimationChannel(
	channel: ElementAnimations["channels"][string],
): channel is ScalarAnimationChannel {
	return channel?.kind === "scalar";
}

export function getEditableScalarChannels({
	animations,
	propertyPath,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
}): EditableScalarChannels | null {
	const binding = animations?.bindings[propertyPath];
	if (!binding) {
		return null;
	}

	const channels = binding.components.flatMap((component) => {
		const channel = animations?.channels[component.channelId];
		if (!isScalarAnimationChannel(channel)) {
			return [];
		}

		return [
			{
				propertyPath,
				componentKey: component.key,
				channelId: component.channelId,
				channel,
			} satisfies ScalarGraphChannel,
		];
	});

	return { binding, channels };
}

export function getEditableScalarChannel({
	animations,
	propertyPath,
	componentKey,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
	componentKey: string;
}): ScalarGraphChannel | null {
	const result = getEditableScalarChannels({ animations, propertyPath });
	return result?.channels.find((channel) => channel.componentKey === componentKey) ?? null;
}

export function getScalarKeyframeContext({
	animations,
	propertyPath,
	componentKey,
	keyframeId,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
	componentKey: string;
	keyframeId: string;
}): ScalarGraphKeyframeContext | null {
	const scalarChannel = getEditableScalarChannel({
		animations,
		propertyPath,
		componentKey,
	});
	if (!scalarChannel) {
		return null;
	}

	const keyframeIndex = scalarChannel.channel.keys.findIndex(
		(keyframe) => keyframe.id === keyframeId,
	);
	if (keyframeIndex < 0) {
		return null;
	}

	return {
		...scalarChannel,
		keyframe: scalarChannel.channel.keys[keyframeIndex],
		keyframeIndex,
		previousKey: scalarChannel.channel.keys[keyframeIndex - 1] ?? null,
		nextKey: scalarChannel.channel.keys[keyframeIndex + 1] ?? null,
	};
}

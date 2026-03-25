import type {
	TAction,
	TActionFunc,
	TActionWithArgs,
	TActionWithOptionalArgs,
	TActionArgsMap,
	TArgOfAction,
	TInvocationTrigger,
} from "./types";

type ActionHandler = (arg: unknown, trigger?: TInvocationTrigger) => void;
const boundActions: Partial<Record<TAction, ActionHandler[]>> = {};

export function bindAction<A extends TAction>(
	action: A,
	handler: TActionFunc<A>,
) {
	const handlers = boundActions[action];
	const typedHandler = handler as ActionHandler;
	if (handlers) {
		handlers.push(typedHandler);
	} else {
		boundActions[action] = [typedHandler];
	}
}

export function unbindAction<A extends TAction>(
	action: A,
	handler: TActionFunc<A>,
) {
	const handlers = boundActions[action];
	if (!handlers) return;

	const typedHandler = handler as ActionHandler;
	boundActions[action] = handlers.filter((h) => h !== typedHandler);

	if (boundActions[action]?.length === 0) {
		delete boundActions[action];
	}
}

type InvokeActionFunc = {
	(
		action: TActionWithOptionalArgs,
		args?: undefined,
		trigger?: TInvocationTrigger,
	): void;
	<A extends TActionWithArgs>(
		action: A,
		args: TActionArgsMap[A],
		trigger?: TInvocationTrigger,
	): void;
};

export const invokeAction: InvokeActionFunc = <A extends TAction>(
	action: A,
	args?: TArgOfAction<A>,
	trigger?: TInvocationTrigger,
) => {
	if (trigger === "keypress") {
		// #region agent log
		fetch("http://127.0.0.1:7245/ingest/669b22f8-172b-4e65-aa3f-1c702ede83f7", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Debug-Session-Id": "3997d9",
			},
			body: JSON.stringify({
				sessionId: "3997d9",
				runId: "initial",
				hypothesisId: "H4",
				location: "actions/registry.ts:invokeAction",
				message: "Action invoked from keypress",
				data: {
					action,
					handlerCount: boundActions[action]?.length ?? 0,
				},
				timestamp: Date.now(),
			}),
		}).catch(() => {});
		// #endregion
	}
	boundActions[action]?.forEach((handler) => {
		handler(args, trigger);
	});
};

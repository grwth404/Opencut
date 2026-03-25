import { useEffect } from "react";
import { invokeAction } from "@/lib/actions";
import { useKeybindingsStore } from "@/stores/keybindings-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { isTypableDOMElement } from "@/utils/browser";

/**
 * a composable that hooks to the caller component's
 * lifecycle and hooks to the keyboard events to fire
 * the appropriate actions based on keybindings
 */
export function useKeybindingsListener() {
	const {
		keybindings,
		getKeybindingString,
		overlayDepth,
		isLoadingProject,
		isRecording,
	} = useKeybindingsStore();
	const clipboard = useTimelineStore((state) => state.clipboard);

	useEffect(() => {
		const eventOptions: AddEventListenerOptions = { capture: true };
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
				hypothesisId: "H1",
				location: "use-keybindings.ts:effect",
				message: "Keybindings listener mounted",
				data: {
					overlayDepth,
					isLoadingProject,
					isRecording,
					keybindingCount: Object.keys(keybindings).length,
				},
				timestamp: Date.now(),
			}),
		}).catch(() => {});
		// #endregion
		const handleKeyDown = (ev: KeyboardEvent) => {
			const normalizedKey = (ev.key ?? "").toLowerCase();
			const shouldLogKey =
				ev.code === "Space" ||
				ev.code.startsWith("Key") ||
				["escape", "delete", "backspace", "enter"].includes(normalizedKey);

			if (overlayDepth > 0 || isLoadingProject || isRecording) {
				if (shouldLogKey) {
					// #region agent log
					fetch(
						"http://127.0.0.1:7245/ingest/669b22f8-172b-4e65-aa3f-1c702ede83f7",
						{
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								"X-Debug-Session-Id": "3997d9",
							},
							body: JSON.stringify({
								sessionId: "3997d9",
								runId: "initial",
								hypothesisId: "H2",
								location: "use-keybindings.ts:blocked",
								message: "Shortcut blocked by runtime gate",
								data: {
									key: ev.key,
									code: ev.code,
									overlayDepth,
									isLoadingProject,
									isRecording,
									targetTag:
										ev.target instanceof HTMLElement ? ev.target.tagName : null,
								},
								timestamp: Date.now(),
							}),
						},
					).catch(() => {});
					// #endregion
				}
				return;
			}

			const binding = getKeybindingString(ev);
			const activeElement = document.activeElement;
			const isTextInput =
				activeElement instanceof HTMLElement &&
				isTypableDOMElement({ element: activeElement });
			const boundAction = binding ? keybindings[binding] : undefined;

			if (shouldLogKey || binding || boundAction) {
				// #region agent log
				fetch(
					"http://127.0.0.1:7245/ingest/669b22f8-172b-4e65-aa3f-1c702ede83f7",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"X-Debug-Session-Id": "3997d9",
						},
						body: JSON.stringify({
							sessionId: "3997d9",
							runId: "initial",
							hypothesisId: !binding ? "H3" : isTextInput ? "H5" : "H4",
							location: "use-keybindings.ts:keydown",
							message: "Shortcut keydown observed",
							data: {
								key: ev.key,
								code: ev.code,
								binding,
								boundAction: boundAction ?? null,
								isTextInput,
								keybindingCount: Object.keys(keybindings).length,
								activeTag:
									activeElement instanceof HTMLElement
										? activeElement.tagName
										: null,
								targetTag:
									ev.target instanceof HTMLElement ? ev.target.tagName : null,
							},
							timestamp: Date.now(),
						}),
					},
				).catch(() => {});
				// #endregion
			}

			if (normalizedKey === "escape" && isTextInput) {
				activeElement.blur();
				return;
			}

			if (!binding) return;
			if (!boundAction) return;

			if (isTextInput) return;
			if (boundAction === "paste-copied") {
				if (!clipboard?.items.length) return;
				ev.preventDefault();
				invokeAction("paste-copied", undefined, "keypress");
				return;
			}

			ev.preventDefault();

			switch (boundAction) {
				case "seek-forward":
					invokeAction("seek-forward", { seconds: 1 }, "keypress");
					break;
				case "seek-backward":
					invokeAction("seek-backward", { seconds: 1 }, "keypress");
					break;
				case "jump-forward":
					invokeAction("jump-forward", { seconds: 5 }, "keypress");
					break;
				case "jump-backward":
					invokeAction("jump-backward", { seconds: 5 }, "keypress");
					break;
				default:
					invokeAction(boundAction, undefined, "keypress");
			}
		};

		document.addEventListener("keydown", handleKeyDown, eventOptions);

		return () => {
			document.removeEventListener("keydown", handleKeyDown, eventOptions);
		};
	}, [
		keybindings,
		getKeybindingString,
		overlayDepth,
		isLoadingProject,
		isRecording,
		clipboard,
	]);
}

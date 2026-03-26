import { useCallback, useEffect, useId, useRef } from "react";
import { useKeybindingsStore } from "@/stores/keybindings-store";

export function useOverlayOpenChange({
	source,
	open,
	onOpenChange,
}: {
	source: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const { openOverlay, closeOverlay } = useKeybindingsStore();
	const isTrackedRef = useRef(false);
	const isControlled = typeof open === "boolean";
	const overlayId = useId();

	useEffect(() => {
		if (!isControlled) return;

		if (open && !isTrackedRef.current) {
			openOverlay(overlayId, source);
			isTrackedRef.current = true;
			return;
		}

		if (!open && isTrackedRef.current) {
			closeOverlay(overlayId, source);
			isTrackedRef.current = false;
		}
	}, [closeOverlay, isControlled, open, openOverlay, overlayId, source]);

	useEffect(() => {
		return () => {
			if (!isTrackedRef.current) return;
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
						runId: "post-fix",
						hypothesisId: "H2",
						location: "use-overlay-open-change.ts:cleanup",
						message: "Overlay closed during unmount cleanup",
						data: { source, overlayId },
						timestamp: Date.now(),
					}),
				},
			).catch(() => {});
			// #endregion
			closeOverlay(overlayId, source);
			isTrackedRef.current = false;
		};
	}, [closeOverlay, overlayId, source]);

	return useCallback(
		(nextOpen: boolean) => {
			if (!isControlled) {
				if (nextOpen && !isTrackedRef.current) {
					openOverlay(overlayId, source);
					isTrackedRef.current = true;
				} else if (!nextOpen && isTrackedRef.current) {
					closeOverlay(overlayId, source);
					isTrackedRef.current = false;
				}
			}

			onOpenChange?.(nextOpen);
		},
		[closeOverlay, isControlled, onOpenChange, openOverlay, overlayId, source],
	);
}

import { useEffect, useState } from "react";

export function useRevealItem(
	highlightId: string | null,
	onClearHighlight: () => void,
	getElement: (id: string) => HTMLElement | null,
	highlightDuration = 1000,
) {
	const [highlightedId, setHighlightedId] = useState<string | null>(null);

	useEffect(() => {
		if (!highlightId) return;

		setHighlightedId(highlightId);

		const target = getElement(highlightId);
		target?.scrollIntoView({ block: "center" });

		const timeout = setTimeout(() => {
			setHighlightedId(null);
			onClearHighlight();
		}, highlightDuration);

		return () => clearTimeout(timeout);
	}, [highlightId, onClearHighlight, highlightDuration, getElement]);

	return { highlightedId };
}

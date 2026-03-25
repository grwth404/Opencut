import { useCallback, useRef } from "react";

export function useElementRegistry() {
	const elementRefs = useRef<Map<string, HTMLElement>>(new Map());

	const registerElement = useCallback(
		(id: string, element: HTMLElement | null) => {
			if (element) {
				elementRefs.current.set(id, element);
				return;
			}

			elementRefs.current.delete(id);
		},
		[],
	);

	const getElement = useCallback((id: string) => {
		return elementRefs.current.get(id) ?? null;
	}, []);

	const getElements = useCallback(() => {
		return elementRefs.current;
	}, []);

	return {
		registerElement,
		getElement,
		getElements,
	};
}

import { useCallback, useEffect, useRef, useState } from "react";

interface SelectionBoxState {
	startPos: { x: number; y: number };
	currentPos: { x: number; y: number };
	isActive: boolean;
	isAdditive: boolean;
	initialSelectedIds: string[];
	initialAnchorId: string | null;
}

function isIntersecting({
	selectionRect,
	itemRect,
}: {
	selectionRect: DOMRect;
	itemRect: DOMRect;
}) {
	return !(
		itemRect.right < selectionRect.left ||
		itemRect.left > selectionRect.right ||
		itemRect.bottom < selectionRect.top ||
		itemRect.top > selectionRect.bottom
	);
}

function createSelectionRect({
	startPos,
	currentPos,
}: {
	startPos: { x: number; y: number };
	currentPos: { x: number; y: number };
}) {
	return new DOMRect(
		Math.min(startPos.x, currentPos.x),
		Math.min(startPos.y, currentPos.y),
		Math.abs(currentPos.x - startPos.x),
		Math.abs(currentPos.y - startPos.y),
	);
}

export function useAssetsSelectionBox({
	containerRef,
	getSelectableElements,
	selectedIds,
	selectionAnchorId,
	onSelectionChange,
}: {
	containerRef: React.RefObject<HTMLElement | null>;
	getSelectableElements: () => Map<string, HTMLElement>;
	selectedIds: string[];
	selectionAnchorId: string | null;
	onSelectionChange: ({
		intersectedIds,
		initialSelectedIds,
		initialAnchorId,
		isAdditive,
	}: {
		intersectedIds: string[];
		initialSelectedIds: string[];
		initialAnchorId: string | null;
		isAdditive: boolean;
	}) => void;
}) {
	const [selectionBox, setSelectionBox] = useState<SelectionBoxState | null>(
		null,
	);
	const justFinishedSelectingRef = useRef(false);
	const isAssetItemTarget = useCallback((target: EventTarget | null) => {
		return target instanceof Element && target.closest("[data-asset-item='true']");
	}, []);

	const handleMouseDown = useCallback(
		(event: React.MouseEvent<HTMLElement>) => {
			if (event.button !== 0) {
				return;
			}

			if (isAssetItemTarget(event.target)) {
				return;
			}

			setSelectionBox({
				startPos: { x: event.clientX, y: event.clientY },
				currentPos: { x: event.clientX, y: event.clientY },
				isActive: false,
				isAdditive: event.ctrlKey || event.metaKey,
				initialSelectedIds: selectedIds,
				initialAnchorId: selectionAnchorId,
			});
		},
		[isAssetItemTarget, selectedIds, selectionAnchorId],
	);

	const updateSelection = useCallback(
		({
			startPos,
			currentPos,
			isAdditive,
			initialSelectedIds,
			initialAnchorId,
		}: SelectionBoxState) => {
			const selectionRect = createSelectionRect({ startPos, currentPos });
			const intersectedIds = [...getSelectableElements().entries()]
				.filter(([, element]) =>
					isIntersecting({
						selectionRect,
						itemRect: element.getBoundingClientRect(),
					}),
				)
				.map(([id]) => id);

			onSelectionChange({
				intersectedIds,
				initialSelectedIds,
				initialAnchorId,
				isAdditive,
			});
		},
		[getSelectableElements, onSelectionChange],
	);

	useEffect(() => {
		if (!selectionBox) {
			return;
		}

		const handleMouseMove = ({ clientX, clientY }: MouseEvent) => {
			const deltaX = Math.abs(clientX - selectionBox.startPos.x);
			const deltaY = Math.abs(clientY - selectionBox.startPos.y);
			const shouldActivate = deltaX > 5 || deltaY > 5;
			const nextSelectionBox = {
				...selectionBox,
				currentPos: { x: clientX, y: clientY },
				isActive: shouldActivate || selectionBox.isActive,
			};

			setSelectionBox(nextSelectionBox);

			if (!nextSelectionBox.isActive) {
				return;
			}

			updateSelection(nextSelectionBox);
		};

		const handleMouseUp = () => {
			if (selectionBox.isActive) {
				justFinishedSelectingRef.current = true;
				requestAnimationFrame(() => {
					justFinishedSelectingRef.current = false;
				});
			}

			setSelectionBox(null);
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [selectionBox, updateSelection]);

	useEffect(() => {
		if (!selectionBox) {
			return;
		}

		const previousBodyUserSelect = document.body.style.userSelect;
		const previousContainerUserSelect = containerRef.current?.style.userSelect ?? "";

		document.body.style.userSelect = "none";
		if (containerRef.current) {
			containerRef.current.style.userSelect = "none";
		}

		return () => {
			document.body.style.userSelect = previousBodyUserSelect;
			if (containerRef.current) {
				containerRef.current.style.userSelect = previousContainerUserSelect;
			}
		};
	}, [containerRef, selectionBox]);

	const shouldIgnoreClick = useCallback(() => {
		return justFinishedSelectingRef.current;
	}, []);

	return {
		selectionBox,
		isSelecting: selectionBox?.isActive ?? false,
		handleMouseDown,
		shouldIgnoreClick,
	};
}

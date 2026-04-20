"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
	BoxSelectionSnapshot,
	ResolveIntersections,
} from "@/selection/types";

interface SelectionBoxState<TId> extends BoxSelectionSnapshot<TId> {
	startPos: { x: number; y: number };
	currentPos: { x: number; y: number };
	isActive: boolean;
	isAdditive: boolean;
}

export function useBoxSelect<TId>({
	containerRef,
	resolveIntersections,
	selectedIds,
	anchorId,
	onSelectionChange,
	shouldStartSelection,
	getIsAdditiveSelection,
	isEnabled = true,
}: {
	containerRef: React.RefObject<HTMLElement | null>;
	resolveIntersections: ResolveIntersections<TId>;
	selectedIds: TId[];
	anchorId: TId | null;
	onSelectionChange: (state: {
		intersectedIds: TId[];
		initialSelectedIds: TId[];
		initialAnchorId: TId | null;
		isAdditive: boolean;
	}) => void;
	shouldStartSelection?: (event: React.MouseEvent<Element>) => boolean;
	getIsAdditiveSelection?: (event: React.MouseEvent<Element>) => boolean;
	isEnabled?: boolean;
}) {
	const [selectionBox, setSelectionBox] =
		useState<SelectionBoxState<TId> | null>(null);
	const justFinishedSelectingRef = useRef(false);
	const shouldStartSelectionCheck = shouldStartSelection ?? (() => true);
	const getIsAdditiveSelectionCheck =
		getIsAdditiveSelection ??
		((event: React.MouseEvent<Element>) => event.ctrlKey || event.metaKey);

	const handleMouseDown = useCallback(
		(event: React.MouseEvent<Element>) => {
			const canStartSelection = shouldStartSelectionCheck(event);
			if (!isEnabled || event.button !== 0 || !canStartSelection) {
				return;
			}

			setSelectionBox({
				startPos: { x: event.clientX, y: event.clientY },
				currentPos: { x: event.clientX, y: event.clientY },
				isActive: false,
				isAdditive: getIsAdditiveSelectionCheck(event),
				initialSelectedIds: selectedIds,
				initialAnchorId: anchorId,
			});
		},
		[
			anchorId,
			getIsAdditiveSelectionCheck,
			isEnabled,
			selectedIds,
			shouldStartSelectionCheck,
		],
	);

	const updateSelection = useCallback(
		({
			startPos,
			currentPos,
			isAdditive,
			initialSelectedIds,
			initialAnchorId,
		}: SelectionBoxState<TId>) => {
			const intersectedIds = resolveIntersections({
				startPos,
				currentPos,
			});
			onSelectionChange({
				intersectedIds,
				initialSelectedIds,
				initialAnchorId,
				isAdditive,
			});
		},
		[onSelectionChange, resolveIntersections],
	);

	useEffect(() => {
		if (!selectionBox) {
			return;
		}

		const handleMouseMove = ({ clientX, clientY }: MouseEvent) => {
			const deltaX = Math.abs(clientX - selectionBox.startPos.x);
			const deltaY = Math.abs(clientY - selectionBox.startPos.y);
			const nextSelectionBox = {
				...selectionBox,
				currentPos: { x: clientX, y: clientY },
				isActive: deltaX > 5 || deltaY > 5 || selectionBox.isActive,
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
		const previousContainerUserSelect =
			containerRef.current?.style.userSelect ?? "";

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
		handleMouseDown,
		isSelecting: selectionBox?.isActive ?? false,
		shouldIgnoreClick,
	};
}

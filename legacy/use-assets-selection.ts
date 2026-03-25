import { useCallback, useEffect, useMemo } from "react";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";

function mergeUniqueIds({ ids }: { ids: string[] }) {
	return [...new Set(ids)];
}

function getRangeIds({
	orderedIds,
	anchorId,
	targetId,
}: {
	orderedIds: string[];
	anchorId: string;
	targetId: string;
}) {
	const anchorIndex = orderedIds.indexOf(anchorId);
	const targetIndex = orderedIds.indexOf(targetId);

	if (anchorIndex === -1 || targetIndex === -1) {
		return [targetId];
	}

	const rangeStart = Math.min(anchorIndex, targetIndex);
	const rangeEnd = Math.max(anchorIndex, targetIndex);
	return orderedIds.slice(rangeStart, rangeEnd + 1);
}

export function useAssetsSelection({
	orderedIds,
}: {
	orderedIds: string[];
}) {
	const {
		selectedMediaIds,
		selectionAnchorId,
		setMediaSelection,
		clearMediaSelection,
	} = useAssetsPanelStore();
	const selectedIdSet = useMemo(() => {
		return new Set(selectedMediaIds);
	}, [selectedMediaIds]);

	useEffect(() => {
		const validIds = new Set(orderedIds);
		const nextSelectedIds = selectedMediaIds.filter((id) => validIds.has(id));
		const nextAnchorId =
			selectionAnchorId && validIds.has(selectionAnchorId)
				? selectionAnchorId
				: nextSelectedIds[nextSelectedIds.length - 1] ?? null;
		const isSelectionUnchanged =
			nextSelectedIds.length === selectedMediaIds.length &&
			nextAnchorId === selectionAnchorId;

		if (isSelectionUnchanged) {
			return;
		}

		setMediaSelection({
			ids: nextSelectedIds,
			anchorId: nextAnchorId,
		});
	}, [orderedIds, selectedMediaIds, selectionAnchorId, setMediaSelection]);

	const replaceSelection = useCallback(
		(ids: string[], anchorId?: string | null) => {
			setMediaSelection({
				ids: mergeUniqueIds({ ids }),
				anchorId,
			});
		},
		[setMediaSelection],
	);

	const isSelected = useCallback(
		(id: string) => {
			return selectedIdSet.has(id);
		},
		[selectedIdSet],
	);

	const toggleSelection = useCallback(
		(id: string) => {
			if (selectedIdSet.has(id)) {
				const nextSelectedIds = selectedMediaIds.filter(
					(selectedId) => selectedId !== id,
				);
				const nextAnchorId =
					selectionAnchorId === id
						? nextSelectedIds[nextSelectedIds.length - 1] ?? null
						: selectionAnchorId;
				replaceSelection(nextSelectedIds, nextAnchorId);
				return;
			}

			replaceSelection([...selectedMediaIds, id], id);
		},
		[
			selectedIdSet,
			selectedMediaIds,
			selectionAnchorId,
			replaceSelection,
		],
	);

	const selectRange = useCallback(
		({
			targetId,
			isAdditive,
		}: {
			targetId: string;
			isAdditive: boolean;
		}) => {
			const anchorId =
				selectionAnchorId ??
				selectedMediaIds[selectedMediaIds.length - 1] ??
				targetId;
			const rangeIds = getRangeIds({
				orderedIds,
				anchorId,
				targetId,
			});
			const nextSelectedIds = isAdditive
				? mergeUniqueIds({
						ids: [...selectedMediaIds, ...rangeIds],
					})
				: rangeIds;

			replaceSelection(nextSelectedIds, anchorId);
		},
		[orderedIds, replaceSelection, selectedMediaIds, selectionAnchorId],
	);

	const handleItemClick = useCallback(
		({
			event,
			id,
		}: {
			event: React.MouseEvent;
			id: string;
		}) => {
			const isToggleSelection = event.ctrlKey || event.metaKey;

			if (event.shiftKey) {
				selectRange({
					targetId: id,
					isAdditive: isToggleSelection,
				});
				return;
			}

			if (isToggleSelection) {
				toggleSelection(id);
				return;
			}

			replaceSelection([id], id);
		},
		[replaceSelection, selectRange, toggleSelection],
	);

	const handleItemContextMenu = useCallback(
		(id: string) => {
			if (selectedIdSet.has(id)) {
				return;
			}

			replaceSelection([id], id);
		},
		[selectedIdSet, replaceSelection],
	);

	const applyBoxSelection = useCallback(
		({
			intersectedIds,
			initialSelectedIds,
			initialAnchorId,
			isAdditive,
		}: {
			intersectedIds: string[];
			initialSelectedIds: string[];
			initialAnchorId: string | null;
			isAdditive: boolean;
		}) => {
			const nextSelectedIds = isAdditive
				? mergeUniqueIds({
						ids: [...initialSelectedIds, ...intersectedIds],
					})
				: intersectedIds;
			const nextAnchorId = isAdditive
				? initialAnchorId ?? intersectedIds[intersectedIds.length - 1] ?? null
				: intersectedIds[intersectedIds.length - 1] ?? null;

			replaceSelection(nextSelectedIds, nextAnchorId);
		},
		[replaceSelection],
	);

	return {
		selectedMediaIds,
		selectionAnchorId,
		isSelected,
		replaceSelection,
		clearSelection: clearMediaSelection,
		handleItemClick,
		handleItemContextMenu,
		applyBoxSelection,
	};
}

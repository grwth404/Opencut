import type { Bookmark } from "@/timeline";
import type { SnapPoint } from "@/timeline/snapping";

export function getBookmarkSnapPoints({
	bookmarks,
	excludeBookmarkTime,
}: {
	bookmarks: Bookmark[];
	excludeBookmarkTime?: number;
}): SnapPoint[] {
	return bookmarks.flatMap((bookmark) => {
		if (excludeBookmarkTime != null && bookmark.time === excludeBookmarkTime) {
			return [];
		}

		return [
			{ time: bookmark.time, type: "bookmark" satisfies SnapPoint["type"] },
		];
	});
}

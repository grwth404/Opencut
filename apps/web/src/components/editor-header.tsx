"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { ChevronLeft, Download } from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { HeaderBase } from "./header-base";

export function EditorHeader() {
  const { activeProject } = useProjectStore();
  const { mediaItems } = useMediaStore();
  const { tracks } = useTimelineStore();

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Export project");
  };

  const leftContent = (
    <Link
      href="/"
      className="font-medium tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity"
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="text-sm">{activeProject?.name || "Loading..."}</span>
    </Link>
  );

  const centerContent = (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{mediaItems.length} media</span>
      <span>•</span>
      <span>{tracks.length} tracks</span>
    </div>
  );

  const rightContent = (
    <nav className="flex items-center gap-2">
      <Button size="sm" onClick={handleExport}>
        <Download className="h-4 w-4" />
        <span className="text-sm">Export</span>
      </Button>
    </nav>
  );

  return (
    <HeaderBase
      leftContent={leftContent}
      centerContent={centerContent}
      rightContent={rightContent}
      className="bg-background border-b"
    />
  );
}

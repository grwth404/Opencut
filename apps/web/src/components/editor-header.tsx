"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { ChevronLeft, Download } from "lucide-react";
import { useTimelineStore } from "@/stores/timeline-store";
import { HeaderBase } from "./header-base";
import { ProjectNameEditor } from "./editor/project-name-editor";
import { formatTimeCode } from "@/lib/time";

export function EditorHeader() {
  const { getTotalDuration } = useTimelineStore();

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Export project");
  };

  const leftContent = (
    <div className="flex items-center gap-2">
      <Link
        href="/"
        className="font-medium tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <ProjectNameEditor />
    </div>
  );

  const centerContent = (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{formatTimeCode(getTotalDuration(), "HH:MM:SS:CS")}</span>
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

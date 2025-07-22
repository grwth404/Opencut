"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { ChevronLeft, Download } from "lucide-react";
import { useTimelineStore } from "@/stores/timeline-store";
import { HeaderBase } from "./header-base";
import { formatTimeCode } from "@/lib/time";
import { useProjectStore } from "@/stores/project-store";
import { KeyboardShortcutsHelp } from "./keyboard-shortcuts-help";
import { useState, useRef } from "react";

export function EditorHeader() {
  const { getTotalDuration } = useTimelineStore();
  const { activeProject, renameProject } = useProjectStore();
  // State for edit mode and project name input
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(activeProject?.name || "");
  // Ref for focusing/selecting the input
  const inputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Export project");
  };

  // When user clicks the project name, enter edit mode and select all text
  const handleNameClick = () => {
    if (!activeProject) return;
    setNewName(activeProject.name);
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  // Save the new name if changed, exit edit mode
  const handleNameSave = async () => {
    if (activeProject && newName.trim() && newName !== activeProject.name) {
      await renameProject(activeProject.id, newName.trim());
    }
    setIsEditing(false);
  };

  // Handle Enter (save) and Escape (cancel) in the input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleNameSave();
    else if (e.key === "Escape") setIsEditing(false);
  };

  // Project name in header: editable input or span
  const leftContent = (
    <div className="flex items-center gap-2">
      <Link
        href="/projects"
        className="font-medium tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <div className="w-[8rem] h-6 flex items-center">
        {isEditing ? (
          // Editable input for project name
          <input
            ref={inputRef}
            className="text-sm font-medium bg-transparent border-b border-primary outline-none px-1 w-full h-6 flex items-center"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleInputKeyDown}
          />
        ) : (
          // Display project name as span, click to edit
          <span
            className="text-sm font-medium cursor-pointer hover:underline truncate w-full h-6 flex items-center"
            title="Click to rename"
            onClick={handleNameClick}
          >
            {activeProject?.name}
          </span>
        )}
      </div>
    </div>
  );

  const centerContent = (
    <div className="flex items-center gap-2 text-xs">
      <span>
        {formatTimeCode(
          getTotalDuration(),
          "HH:MM:SS:FF",
          activeProject?.fps || 30
        )}
      </span>
    </div>
  );

  const rightContent = (
    <nav className="flex items-center gap-2">
      <KeyboardShortcutsHelp />
      <Button
        size="sm"
        variant="primary"
        className="h-7 text-xs"
        onClick={handleExport}
      >
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
      className="bg-background h-[3.2rem] px-4 items-center"
    />
  );
}

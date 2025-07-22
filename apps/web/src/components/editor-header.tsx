"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { ChevronLeft, Download } from "lucide-react";
import { useTimelineStore } from "@/stores/timeline-store";
import { HeaderBase } from "./header-base";
import { formatTimeCode } from "@/lib/time";
import { useProjectStore } from "@/stores/project-store";
import { KeyboardShortcutsHelp } from "./keyboard-shortcuts-help";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

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

  // When user clicks the project name, enter edit mode
  const handleNameClick = () => {
    if (!activeProject) return;
    setNewName(activeProject.name);
    setIsEditing(true);
  };

  // Focus/select input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Save the new name if changed, exit edit mode
  const handleNameSave = async () => {
    if (activeProject && newName.trim() && newName !== activeProject.name) {
      try {
        await renameProject(activeProject.id, newName.trim());
      }catch (error) {
        console.error('Failed to rename project:', error);
        // Reset to original name on error
        setNewName(activeProject.name);
      }
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
      <div className="w-[14rem] h-9 flex items-center">
        {isEditing ? (
          // Editable input for project name using standard Input component
          <Input
            ref={inputRef}
            className="text-sm font-medium px-2 py-1 h-9 truncate"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleInputKeyDown}
            maxLength={64}
            aria-label="Project name"
            autoFocus
          />
        ) : (
          // Display project name as span, click to edit
          <span
            className="text-sm font-medium cursor-pointer hover:underline"
            title="Click to rename"
            role="button"
            tabIndex={0}
            onClick={handleNameClick}
            onKeyDown={e => e.key === 'Enter' && handleNameClick()}
          ><div className="truncate text-ellipsis overflow-clip w-40">{activeProject?.name}</div>
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

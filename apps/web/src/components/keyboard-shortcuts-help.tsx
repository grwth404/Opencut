"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Keyboard } from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

const KeyBadge = ({ keyName }: { keyName: string }) => {
  // Replace common key names with symbols
  const displayKey = keyName
    .replace("Cmd", "⌘")
    .replace("Shift", "⇧")
    .replace("←", "◀")
    .replace("→", "▶")
    .replace("Space", "⎵");

  return (
    <Badge variant="secondary" className="font-mono text-xs px-2 py-1">
      {displayKey}
    </Badge>
  );
};

const ShortcutItem = ({ shortcut }: { shortcut: any }) => (
  <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50">
    <div className="flex items-center gap-3">
      {shortcut.icon && (
        <div className="text-muted-foreground">{shortcut.icon}</div>
      )}
      <span className="text-sm">{shortcut.description}</span>
    </div>
    <div className="flex items-center gap-1">
      {shortcut.keys.map((key: string, index: number) => (
        <div key={index} className="flex items-center gap-1">
          <KeyBadge keyName={key} />
          {index < shortcut.keys.length - 1 && (
            <span className="text-xs text-muted-foreground">+</span>
          )}
        </div>
      ))}
    </div>
  </div>
);

export const KeyboardShortcutsHelp = () => {
  const [open, setOpen] = useState(false);

  // Get shortcuts from centralized hook (disabled so it doesn't add event listeners)
  const { shortcuts } = useKeyboardShortcuts({ enabled: false });

  const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="text" size="sm" className="gap-2">
          <Keyboard className="w-4 h-4" />
          Shortcuts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your video editing workflow with these keyboard shortcuts.
            Most shortcuts work when the timeline is focused.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                {category}
              </h3>
              <div className="space-y-1">
                {shortcuts
                  .filter((shortcut) => shortcut.category === category)
                  .map((shortcut, index) => (
                    <ShortcutItem key={index} shortcut={shortcut} />
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Tips:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              • Shortcuts work when the editor is focused (not typing in inputs)
            </li>
            <li>• J/K/L are industry-standard video editing shortcuts</li>
            <li>• Use arrow keys for frame-perfect positioning</li>
            <li>• Hold Shift with arrow keys for larger jumps</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};

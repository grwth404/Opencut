"use client";

import { useState } from "react";
import { TransitionUpIcon } from "./icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

export function ExportButton() {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const handleExport = () => {
    setIsExportDialogOpen(true);
  };

  return (
    <>
      <button
        className="flex items-center gap-1.5 bg-[#38BDF8] text-white rounded-md px-[0.12rem] py-[0.12rem] cursor-pointer hover:brightness-95 transition-all duration-200"
        onClick={handleExport}
      >
        <div className="flex items-center gap-1.5 bg-linear-270 from-[#2567EC] to-[#37B6F7] rounded-[0.8rem] px-4 py-1 relative shadow-[0_1px_3px_0px_rgba(0,0,0,0.65)]">
          <TransitionUpIcon className="z-50" />
          <span className="text-[0.875rem] z-50">Export (soon)</span>
          <div className="absolute w-full h-full left-0 top-0 bg-linear-to-t from-white/0 to-white/50 z-10 rounded-[0.8rem] flex items-center justify-center">
            <div className="absolute w-[calc(100%-2px)] h-[calc(100%-2px)] top-[0.08rem] bg-linear-270 from-[#2567EC] to-[#37B6F7] z-50 rounded-[0.8rem]"></div>
          </div>
        </div>
      </button>
      <ExportDialog
        isOpen={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
      />
    </>
  );
}

function ExportDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-6">
        <DialogHeader>
          <DialogTitle>Export Project</DialogTitle>
        </DialogHeader>
        <div>
          <p className="text-muted-foreground">
            Export functionality is not ready yet. We're currently working on a
            custom pipeline to make this possible.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

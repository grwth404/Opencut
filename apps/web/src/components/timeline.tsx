"use client";

import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import {
  Scissors,
  ArrowLeftToLine,
  ArrowRightToLine,
  Trash2,
  Snowflake,
  Copy,
  SplitSquareHorizontal,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "./ui/tooltip";

export function Timeline() {
  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b flex items-center px-2 py-1 gap-1">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Scissors className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split clip (S)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <ArrowLeftToLine className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split and keep left (A)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <ArrowRightToLine className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split and keep right (D)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <SplitSquareHorizontal className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Separate audio (E)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate clip (Ctrl+D)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Snowflake className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Freeze frame (F)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete clip (Delete)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Tracks Area */}
      <ScrollArea className="flex-1">
        <div className="min-w-[800px]">
          {/* Time Markers */}
          <div className="py-2 pt-1 flex items-center">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="w-[50px] flex items-end justify-center text-xs text-muted-foreground"
              >
                {i}s
              </div>
            ))}
          </div>

          {/* Video Track */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center px-2">
              <div className="flex-1">
                <TimelineClip />
              </div>
            </div>

            {/* Audio Track */}
            <div className="flex items-center px-2">
              <div className="flex-1">
                <TimelineClip />
              </div>
            </div>

            {/* Effects Track */}
            <div className="flex items-center px-2">
              <div className="flex-1">
                <TimelineClip />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function TimelineClip() {
  return (
    <div className="flex-1 h-[3.8rem]">
      <div className="h-full bg-blue-500/20 border border-blue-500/30 rounded-sm mx-3 cursor-pointer transition-colors" />
    </div>
  );
}

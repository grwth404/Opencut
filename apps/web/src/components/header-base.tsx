"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HeaderBaseProps {
  leftContent?: ReactNode;
  centerContent?: ReactNode;
  rightContent?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function HeaderBase({
  leftContent,
  centerContent,
  rightContent,
  className,
  children,
}: HeaderBaseProps) {
  // If children is provided, render it directly without the grid layout
  if (children) {
    return (
      <header className={cn("px-6 h-16 flex items-center", className)}>
        {children}
      </header>
    );
  }

  return (
    <header className={cn("px-6 h-14 flex justify-between", className)}>
      {leftContent && leftContent}
      {centerContent && centerContent}
      {rightContent && rightContent}
    </header>
  );
}

"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

/**
 * VisuallyHidden component provides content that is accessible to screen readers
 * but visually hidden from sighted users. This is useful for providing context
 * or labels that are necessary for accessibility but would be redundant visually.
 * 
 * Based on the Radix UI VisuallyHidden primitive pattern.
 */
const VisuallyHidden = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      // Screen reader only styles - visually hidden but accessible
      "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
      // Alternative approach using sr-only if preferred
      // "sr-only",
      className
    )}
    {...props}
  />
));

VisuallyHidden.displayName = "VisuallyHidden";

export { VisuallyHidden };

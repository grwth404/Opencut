import { cn } from "@/lib/utils";

interface PropertyItemProps {
  direction?: "row" | "column";
  children: React.ReactNode;
  className?: string;
}

export function PropertyItem({
  direction = "row",
  children,
  className,
}: PropertyItemProps) {
  return (
    <div
      className={cn(
        "flex gap-2",
        direction === "row"
          ? "items-center justify-between gap-6"
          : "flex-col gap-1.5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PropertyItemLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("text-xs text-muted-foreground", className)}>
      {children}
    </label>
  );
}

export function PropertyItemValue({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex-1 text-sm", className)}>{children}</div>;
}

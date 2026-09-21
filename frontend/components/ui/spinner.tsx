import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const spinnerVariants = cva("spinner-ring", {
  variants: {
    size: {
      sm: "size-4",
      default: "size-8",
      lg: "size-12",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

export function Spinner({ size, label, className, ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      className={cn("flex flex-col items-center justify-center gap-3", className)}
      {...props}
    >
      <span className={cn(spinnerVariants({ size }))} aria-hidden="true" />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}

/** Full-section centered spinner for page/panel loading states. */
export function SpinnerBlock({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn("brand-card flex items-center justify-center p-10", className)}>
      <Spinner label={label} />
    </div>
  );
}

/**
 * Bare spinner glyph, no wrapper, no label — for inline use next to short
 * status text inside a button ("Switching…", "Connecting…") where the
 * flex-column `Spinner` layout doesn't fit.
 */
export function SpinnerIcon({
  size,
  className,
}: {
  size?: VariantProps<typeof spinnerVariants>["size"];
  className?: string;
}) {
  return <span className={cn(spinnerVariants({ size }), className)} aria-hidden="true" />;
}

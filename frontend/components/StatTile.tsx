import type { ComponentType, ReactNode } from "react";

export function StatTile({
  icon: Icon,
  label,
  children,
  hint,
}: {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="brand-card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="w-3.5 h-3.5 text-accent" />} {label}
      </div>
      <p className="text-3xl font-bold text-accent mt-2 tabular-nums">{children}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

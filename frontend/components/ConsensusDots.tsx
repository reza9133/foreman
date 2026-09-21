/**
 * ConsensusDots
 *
 * Purely decorative "N validators, one verdict" visual — a row of pulsing
 * dots (staggered) converging into a single accent dot. Used anywhere we
 * talk about GenLayer's multi-validator adjudication, so the concept isn't
 * only described in text.
 */
export function ConsensusDots({ className = "" }: { className?: string }) {
  const validators = [0, 1, 2, 3, 4];

  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden="true">
      <div className="flex items-center gap-1.5">
        {validators.map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-accent animate-consensus-pulse"
            style={{ animationDelay: `${i * 180}ms` }}
          />
        ))}
      </div>
      <span className="text-muted-foreground text-xs">→</span>
      <span className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_10px_2px] shadow-accent/50" />
    </div>
  );
}

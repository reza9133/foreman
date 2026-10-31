/** Histogram of verdict payout percentages (0–100) in equal buckets. */
export function PayoutHistogram({ bins }: { bins: number[] }) {
  const max = Math.max(1, ...bins);
  const n = bins.length;
  const step = 100 / n;

  return (
    <div>
      <div className="flex items-end gap-2 h-36" role="img" aria-label="Distribution of payout percentages">
        {bins.map((count, i) => {
          const h = Math.round((count / max) * 100);
          const lo = Math.round(i * step);
          const hi = Math.round((i + 1) * step);
          const hue = i / Math.max(1, n - 1);
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
              <span className="text-xs font-semibold tabular-nums">{count}</span>
              <div
                className="w-full rounded-t-md transition-[height] duration-700"
                style={{
                  height: `${Math.max(count > 0 ? 6 : 2, h)}%`,
                  background: `oklch(${0.6 + hue * 0.05} ${0.12 + hue * 0.06} ${20 + hue * 140})`,
                  opacity: count > 0 ? 1 : 0.25,
                }}
                title={`${lo}–${hi}%: ${count} verdict${count === 1 ? "" : "s"}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-2 text-[11px] text-muted-foreground">
        {bins.map((_, i) => (
          <span key={i} className="flex-1 text-center">
            {Math.round(i * step)}–{Math.round((i + 1) * step)}%
          </span>
        ))}
      </div>
    </div>
  );
}

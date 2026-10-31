/**
 * Semicircular gauge for a 0–100 payout percentage. The 50% mark is the
 * contract's accept/reject line (`accepted = payout_percent >= 50`).
 */
export function VerdictGauge({ percent, className = "" }: { percent: number; className?: string }) {
  const p = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const R = 70;
  const arc = Math.PI * R; // half circumference
  const accepted = p >= 50;
  const color = accepted ? "oklch(0.6 0.14 160)" : "oklch(0.58 0.2 20)";
  // needle angle: 0% = left (180°), 100% = right (0°)
  const angle = Math.PI * (1 - p / 100);
  const nx = 90 + Math.cos(angle) * (R - 14);
  const ny = 90 - Math.sin(angle) * (R - 14);
  const tx = 90 + Math.cos(Math.PI / 2) * (R + 10);

  return (
    <svg
      viewBox="0 0 180 112"
      className={`w-full max-w-[260px] ${className}`}
      role="img"
      aria-label={`Verdict ${p}% — ${accepted ? "accepted" : "rejected"}`}
    >
      <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="oklch(0.5 0.02 80 / 0.14)" strokeWidth="14" strokeLinecap="round" />
      <path
        d="M 20 90 A 70 70 0 0 1 160 90"
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${(p / 100) * arc} ${arc}`}
        style={{ transition: "stroke-dasharray 0.9s cubic-bezier(0.2,0.7,0.2,1)" }}
      />
      <line x1="90" y1="14" x2="90" y2="26" stroke="oklch(0.3 0.02 80)" strokeWidth="2" opacity="0.5" />
      <text x={tx} y="9" textAnchor="middle" fontSize="8" className="fill-muted-foreground">
        accept line · 50%
      </text>
      <line x1="90" y1="90" x2={nx} y2={ny} stroke="oklch(0.25 0.02 80)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="90" cy="90" r="5" fill="oklch(0.25 0.02 80)" />
      <text x="90" y="110" textAnchor="middle" fontSize="16" fontWeight="700" className="fill-foreground">
        {p}%
      </text>
    </svg>
  );
}

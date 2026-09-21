/**
 * AnimatedGear
 *
 * Purely decorative. Reuses the tooth pattern from the Foreman mark
 * (Logo.tsx) at hero scale with a slow continuous spin — the mark is
 * already a literal gear, this just lets it turn. Two gears counter-rotate
 * at different speeds for a bit of depth. Doesn't touch the real Logo
 * component or GenLayer's mark, so it's safe to spin freely.
 */

function GearTeeth({ className }: { className?: string }) {
  return (
    <g className={className} fill="currentColor">
      <rect x="44" y="0" width="12" height="16" rx="3" />
      <rect x="44" y="84" width="12" height="16" rx="3" />
      <rect x="0" y="44" width="16" height="12" rx="3" />
      <rect x="84" y="44" width="16" height="12" rx="3" />
      <rect x="10" y="10" width="12" height="16" rx="3" transform="rotate(-45 16 18)" />
      <rect x="78" y="10" width="12" height="16" rx="3" transform="rotate(45 84 18)" />
      <rect x="10" y="74" width="12" height="16" rx="3" transform="rotate(45 16 82)" />
      <rect x="78" y="74" width="12" height="16" rx="3" transform="rotate(-45 84 82)" />
    </g>
  );
}

export function AnimatedGear({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="foreman-gear-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.65 0.22 80)" />
          <stop offset="55%" stopColor="oklch(0.78 0.18 50)" />
          <stop offset="100%" stopColor="oklch(0.55 0.37 265)" />
        </linearGradient>
      </defs>

      {/* Outer ring of teeth — slow spin */}
      <g className="animate-spin-slow" style={{ transformOrigin: "50px 50px" }}>
        <GearTeeth className="text-accent/70" />
      </g>

      {/* Inner hub — counter-rotates a little faster for a parallax feel */}
      <g className="animate-spin-slow-reverse" style={{ transformOrigin: "50px 50px" }}>
        <circle cx="50" cy="50" r="30" fill="url(#foreman-gear-gradient)" opacity="0.9" />
        <text
          x="50"
          y="65"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="800"
          fontSize="38"
          fill="oklch(0.98 0 0)"
          textAnchor="middle"
        >
          F
        </text>
      </g>
    </svg>
  );
}

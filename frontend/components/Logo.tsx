/**
 * Foreman Logo Component
 *
 * Variants:
 * - "full": Strong Mark + Wordmark (for desktop/larger spaces)
 * - "mark": Strong Mark only (for mobile/compact spaces)
 * - "wordmark": Wordmark only (for specific cases)
 */

import React from 'react';

export type LogoVariant = 'full' | 'mark' | 'wordmark';
export type LogoSize = 'sm' | 'md' | 'lg';
export type LogoTheme = 'light' | 'dark';

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  theme?: LogoTheme;
  className?: string;
}

const sizeMap = {
  sm: { mark: 'w-5 h-5', text: 'text-base' },
  md: { mark: 'w-6 h-6', text: 'text-xl' },
  lg: { mark: 'w-8 h-8', text: 'text-2xl' },
};

export function Logo({
  variant = 'full',
  size = 'md',
  theme = 'dark',
  className = '',
}: LogoProps) {
  const colorClass = theme === 'dark' ? 'text-foreground' : 'text-background';
  const { mark: markSize, text: textSize } = sizeMap[size];

  // Foreman Strong Mark (Gear + F symbol)
  const ForemanMark = () => (
    <svg
      className={`${markSize} ${colorClass} transition-colors`}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Foreman Logo"
    >
      <g fill="currentColor">
        <rect x="44" y="0" width="12" height="16" rx="3" />
        <rect x="44" y="84" width="12" height="16" rx="3" />
        <rect x="0" y="44" width="16" height="12" rx="3" />
        <rect x="84" y="44" width="16" height="12" rx="3" />
        <rect x="10" y="10" width="12" height="16" rx="3" transform="rotate(-45 16 18)" />
        <rect x="78" y="10" width="12" height="16" rx="3" transform="rotate(45 84 18)" />
        <rect x="10" y="74" width="12" height="16" rx="3" transform="rotate(45 16 82)" />
        <rect x="78" y="74" width="12" height="16" rx="3" transform="rotate(-45 84 82)" />
      </g>
      <circle cx="50" cy="50" r="34" fill="currentColor" />
      <text
        x="50"
        y="66"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="800"
        fontSize="42"
        fill="var(--background, #fff)"
        textAnchor="middle"
      >
        F
      </text>
    </svg>
  );

  // GenLayer Strong Mark (Triangle/Hands symbol)
  const GenLayerMark = () => (
    <svg
      className={`${markSize} ${colorClass} transition-colors`}
      viewBox="0 0 97.76 91.93"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="GenLayer Logo"
    >
      <path
        fill="currentColor"
        d="M44.26 32.35L27.72 67.12L43.29 74.9L0 91.93L44.26 0L44.26 32.35ZM53.5 32.35L70.04 67.12L54.47 74.9L97.76 91.93L53.5 0L53.5 32.35ZM48.64 43.78L58.33 62.94L48.64 67.69L39.47 62.92L48.64 43.78Z"
      />
    </svg>
  );

  // Both marks side by side, separated by a thin divider
  const StrongMark = () => (
    <div className={`inline-flex items-center gap-2 ${className.includes('gap') ? '' : ''}`}>
      <ForemanMark />
      <span className={`w-px h-5 bg-current opacity-20 ${colorClass}`} />
      <GenLayerMark />
    </div>
  );

  // Wordmark (using Space Grotesk from layout)
  const Wordmark = () => (
    <span
      className={`${textSize} font-bold ${colorClass} font-[family-name:var(--font-display)] transition-colors`}
      style={{ letterSpacing: '-0.02em' }}
    >
      Foreman
    </span>
  );

  if (variant === 'mark') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <StrongMark />
      </div>
    );
  }

  if (variant === 'wordmark') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <Wordmark />
      </div>
    );
  }

  // Full logo (default): Strong Mark + Wordmark
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <StrongMark />
      <Wordmark />
    </div>
  );
}

// Convenience components for common use cases
export function LogoFull(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="full" />;
}

export function LogoMark(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="mark" />;
}

export function LogoWordmark(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="wordmark" />;
}

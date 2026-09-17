const WEI_PER_GEN = 10n ** 18n;

/** Format a wei string/bigint as a human GEN amount, trimmed of trailing zeros. */
export function formatGen(wei: string | bigint | number, maxDecimals = 4): string {
  const value = typeof wei === "bigint" ? wei : BigInt(Math.trunc(Number(wei)) || 0);
  const whole = value / WEI_PER_GEN;
  const fraction = value % WEI_PER_GEN;

  if (fraction === 0n) return whole.toString();

  const fractionStr = fraction.toString().padStart(18, "0").slice(0, maxDecimals);
  const trimmed = fractionStr.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}

/** Parse a human GEN amount (e.g. "2.5") entered in a form into a wei bigint. */
export function parseGen(amount: string): bigint {
  const trimmed = amount.trim();
  if (!trimmed) return 0n;

  const [wholePart, fracPart = ""] = trimmed.split(".");
  const whole = BigInt(wholePart || "0");
  const fracPadded = (fracPart + "0".repeat(18)).slice(0, 18);
  const frac = BigInt(fracPadded || "0");

  return whole * WEI_PER_GEN + frac;
}

/** Format a unix-seconds timestamp as a short relative or absolute label. */
export function formatDeadline(unixSeconds: number): string {
  if (!unixSeconds) return "—";
  const now = Date.now() / 1000;
  const diff = unixSeconds - now;

  const date = new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (diff <= 0) return `${date} (passed)`;

  const days = Math.floor(diff / 86400);
  if (days >= 1) return `${date} (${days}d left)`;

  const hours = Math.floor(diff / 3600);
  return `${date} (${hours}h left)`;
}

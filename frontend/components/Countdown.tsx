"use client";

import { useEffect, useState } from "react";
import { countdownTo, formatCountdown } from "@/lib/utils/time";

/** Live countdown that ticks once a minute (once a second in the final minute). */
export function Countdown({ target, label = "left", doneLabel = "passed", className = "" }: {
  target: number;
  label?: string;
  doneLabel?: string;
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const c = countdownTo(target);
    const every = c.seconds <= 60 ? 1000 : 30000;
    const id = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return <span className={className}>—</span>;
  if (now === null) return <span className={className}>…</span>;
  const c = countdownTo(target, now);
  return <span className={className}>{c.done ? doneLabel : `${formatCountdown(c)} ${label}`}</span>;
}

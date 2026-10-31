"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion, useInView } from "@/lib/utils/motion";

/** Eases a number from 0 to `value` once visible. Respects reduced motion. */
export function CountUp({
  value,
  duration = 900,
  format = (n: number) => Math.round(n).toLocaleString(),
  className = "",
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced || duration <= 0) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(origin + (value - origin) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced, inView]);

  return (
    <span ref={ref} className={className}>
      {format(shown)}
    </span>
  );
}

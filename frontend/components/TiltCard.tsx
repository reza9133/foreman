"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/lib/utils/motion";

/**
 * Pointer-driven 3D tilt with a moving specular glare. Writes CSS variables
 * directly on the element (no React state), so hovering never re-renders.
 * Disabled for reduced-motion users and on touch pointers.
 */
export function TiltCard({
  children,
  className = "",
  max = 7,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType === "touch") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--tilt-y", `${((px - 0.5) * 2 * max).toFixed(2)}deg`);
    el.style.setProperty("--tilt-x", `${(-(py - 0.5) * 2 * max).toFixed(2)}deg`);
    el.style.setProperty("--glare-x", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--glare-y", `${(py * 100).toFixed(1)}%`);
  };

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  };

  return (
    <div className="tilt-scene h-full">
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={reset}
        className={`tilt-card relative h-full ${className}`}
        style={{ "--tilt-x": "0deg", "--tilt-y": "0deg" } as CSSProperties}
      >
        {children}
        <span className="tilt-glare" aria-hidden="true" />
      </div>
    </div>
  );
}

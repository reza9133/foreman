"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";
import { useInView } from "@/lib/utils/motion";

/**
 * Fades/slides its children in the first time they scroll into view.
 * Pure CSS transition driven by one IntersectionObserver per element that
 * disconnects after firing, so it costs nothing once revealed.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  as?: ElementType;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLElement>();
  const style = { "--reveal-delay": `${delay}ms` } as CSSProperties;
  return (
    <Tag ref={ref} style={style} className={`reveal ${inView ? "is-visible" : ""} ${className}`}>
      {children}
    </Tag>
  );
}

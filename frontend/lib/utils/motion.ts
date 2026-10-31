"use client";

import { useEffect, useState } from "react";

/** True when the visitor has asked the OS for reduced motion. SSR-safe (false until mounted). */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** True once the element has been scrolled into view (and stays true). */
export function useInView<T extends Element>(rootMargin = "0px 0px -10% 0px") {
  const [node, setNode] = useState<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!node || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [node, inView, rootMargin]);
  return { ref: setNode, inView };
}

/** Tracks whether an element is currently on screen (toggles), used to pause offscreen animation loops. */
export function useIsVisible<T extends Element>() {
  const [node, setNode] = useState<T | null>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) setVisible(e.isIntersecting);
    });
    io.observe(node);
    return () => io.disconnect();
  }, [node]);
  return { ref: setNode, visible };
}

"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/utils/motion";

// three.js is ~150 kB gzipped: load it only on the client, only when WebGL
// exists, and never block first paint on it.
const EscrowScene = dynamic(() => import("./EscrowScene"), { ssr: false });

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function EscrowSceneLoader({ className = "" }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    // Defer until the browser is idle so the 3D bundle never competes with
    // the initial render, data fetches or hydration.
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const go = () => setEnabled(hasWebGL());
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(go, { timeout: 1500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = setTimeout(go, 400);
    return () => clearTimeout(t);
  }, []);

  if (!enabled) return null;
  return (
    <div className={`scene-canvas ${ready ? "is-ready" : ""} ${className}`}>
      <EscrowScene reducedMotion={reduced} onReady={onReady} />
    </div>
  );
}

"use client";

import type { OrderStatus } from "@/lib/contracts/types";
import { STATUS_COLORS } from "./charts/StatusDonut";

interface NodePos {
  x: number;
  y: number;
}

const NODES: Record<OrderStatus, NodePos> = {
  open: { x: 120, y: 170 },
  claimed: { x: 380, y: 170 },
  completed: { x: 700, y: 60 },
  rejected: { x: 700, y: 170 },
  expired: { x: 380, y: 320 },
  cancelled: { x: 120, y: 320 },
};

const LABEL: Record<OrderStatus, string> = {
  open: "Open",
  claimed: "Claimed",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  expired: "Expired",
};

interface Edge {
  id: string; // transition id
  d: string;
  label: string;
  lx: number;
  ly: number;
}

const EDGES: Edge[] = [
  { id: "create", d: "M 10 170 L 68 170", label: "create_order", lx: 52, ly: 134 },
  { id: "claim", d: "M 172 158 L 328 158", label: "claim_order", lx: 250, ly: 146 },
  { id: "abandon", d: "M 328 184 L 172 184", label: "abandon_claim", lx: 250, ly: 202 },
  { id: "cancel", d: "M 120 200 L 120 290", label: "cancel_order", lx: 120, ly: 250 },
  { id: "expire", d: "M 380 200 L 380 290", label: "expire_order", lx: 380, ly: 250 },
  { id: "submit", d: "M 428 150 C 520 110 560 80 648 62", label: "submit ≥ 50%", lx: 540, ly: 84 },
  { id: "reject", d: "M 432 170 L 648 170", label: "submit < 50%", lx: 540, ly: 160 },
  { id: "appeal", d: "M 712 142 L 712 90", label: "appeal (flips either way)", lx: 790, ly: 118 },
];

/**
 * Interactive order state machine. `activeEdges` are highlighted (a scenario
 * step), `currentState` glows, and clicking a state reports it upward.
 */
export function LifecycleDiagram({
  currentState,
  activeEdges = [],
  visited = [],
  onSelectState,
  selected,
}: {
  currentState?: OrderStatus | null;
  activeEdges?: string[];
  visited?: string[];
  onSelectState?: (s: OrderStatus) => void;
  selected?: OrderStatus | null;
}) {
  return (
    <svg viewBox="0 0 880 380" className="w-full h-auto" role="img" aria-label="Order lifecycle state machine">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
        </marker>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {EDGES.map((e) => {
        const active = activeEdges.includes(e.id);
        const seen = visited.includes(e.id);
        const stroke = active ? "oklch(0.62 0.2 60)" : seen ? "oklch(0.6 0.12 160)" : "oklch(0.55 0.02 80 / 0.55)";
        return (
          <g key={e.id}>
            <path
              d={e.d}
              fill="none"
              stroke={stroke}
              strokeWidth={active ? 3.5 : 2}
              markerEnd="url(#arrow)"
              strokeDasharray={active ? "7 5" : undefined}
              style={active ? { animation: "dashFlow 0.8s linear infinite" } : undefined}
            />
            <text
              x={e.lx}
              y={e.ly}
              textAnchor="middle"
              fontSize="11"
              className={active ? "fill-foreground" : "fill-muted-foreground"}
              fontWeight={active ? 700 : 400}
            >
              {e.label}
            </text>
          </g>
        );
      })}

      {/* extend_deadline self-loop on Claimed */}
      <path
        d="M 352 140 C 330 100 430 100 408 140"
        fill="none"
        stroke={activeEdges.includes("extend") ? "oklch(0.62 0.2 60)" : "oklch(0.55 0.02 80 / 0.55)"}
        strokeWidth={activeEdges.includes("extend") ? 3.5 : 2}
        markerEnd="url(#arrow)"
      />
      <text x="380" y="92" textAnchor="middle" fontSize="11" className="fill-muted-foreground">
        extend_deadline
      </text>

      {(Object.keys(NODES) as OrderStatus[]).map((s) => {
        const { x, y } = NODES[s];
        const isCurrent = currentState === s;
        const isSel = selected === s;
        const terminal = ["completed", "rejected", "cancelled", "expired"].includes(s);
        return (
          <g
            key={s}
            transform={`translate(${x} ${y})`}
            onClick={() => onSelectState?.(s)}
            style={{ cursor: onSelectState ? "pointer" : "default" }}
            role={onSelectState ? "button" : undefined}
            tabIndex={onSelectState ? 0 : undefined}
            onKeyDown={(ev) => {
              if (onSelectState && (ev.key === "Enter" || ev.key === " ")) {
                ev.preventDefault();
                onSelectState(s);
              }
            }}
            aria-label={`${LABEL[s]} state`}
          >
            <rect
              x="-52"
              y="-30"
              width="104"
              height="60"
              rx="14"
              fill="var(--card)"
              stroke={STATUS_COLORS[s]}
              strokeWidth={isCurrent || isSel ? 4 : 2}
              filter={isCurrent ? "url(#glow)" : undefined}
            />
            {terminal && <rect x="-46" y="-24" width="92" height="48" rx="10" fill="none" stroke={STATUS_COLORS[s]} strokeWidth="1" opacity="0.6" />}
            <text y="5" textAnchor="middle" fontSize="14" fontWeight="700" className="fill-foreground">
              {LABEL[s]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

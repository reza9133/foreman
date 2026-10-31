"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { LifecycleDiagram } from "@/components/LifecycleDiagram";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import { SCENARIOS, STATES, TRANSITIONS, transitionById, transitionsFrom } from "@/lib/lifecycle";
import type { OrderStatus } from "@/lib/contracts/types";

const CALLER_LABEL = { client: "Client", provider: "Provider", anyone: "Anyone", consensus: "Validators" } as const;

export default function LifecyclePage() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [step, setStep] = useState(-1); // -1 = before first step
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<OrderStatus | null>(null);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!;
  const done = step >= scenario.steps.length - 1;

  const visited = useMemo(() => scenario.steps.slice(0, Math.max(0, step)), [scenario, step]);
  const activeId = step >= 0 ? scenario.steps[step] : undefined;
  const active = activeId ? transitionById(activeId) : undefined;
  const current: OrderStatus | null = active ? active.to : null;

  useEffect(() => {
    if (!playing) return;
    if (done) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setStep((s) => s + 1), 1600);
    return () => clearTimeout(id);
  }, [playing, step, done]);

  const choose = (id: string) => {
    setScenarioId(id);
    setStep(-1);
    setPlaying(false);
  };

  const stateInfo = selected ? STATES.find((s) => s.id === selected) : null;
  const outgoing = selected ? transitionsFrom(selected) : [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-24 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Order lifecycle, live</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every transition below is a real contract method. Pick a scenario and play it, or click a state to see what
              can leave it, who may call it and what it guards against.
            </p>
          </div>

          <Reveal>
            <div className="brand-card p-4 md:p-6 space-y-4">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Scenarios">
                {SCENARIOS.map((s) => (
                  <Button
                    key={s.id}
                    role="tab"
                    aria-selected={s.id === scenarioId}
                    size="sm"
                    variant={s.id === scenarioId ? "default" : "outline"}
                    onClick={() => choose(s.id)}
                  >
                    {s.title}
                  </Button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{scenario.summary}</p>

              <LifecycleDiagram
                currentState={current}
                activeEdges={activeId ? [activeId] : []}
                visited={visited}
                selected={selected}
                onSelectState={(s) => setSelected((prev) => (prev === s ? null : s))}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (done) setStep(-1);
                    setPlaying((p) => !p);
                  }}
                >
                  {playing ? <Pause /> : <Play />} {playing ? "Pause" : done ? "Replay" : "Play"}
                </Button>
                <Button size="sm" variant="outline" disabled={done} onClick={() => setStep((s) => Math.min(scenario.steps.length - 1, s + 1))}>
                  <StepForward /> Step
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setStep(-1); setPlaying(false); }}>
                  <RotateCcw /> Reset
                </Button>
                <span className="text-xs text-muted-foreground ml-auto">
                  Step {Math.max(0, step + 1)} / {scenario.steps.length}
                </span>
              </div>

              <div className="rounded-lg border border-border/70 bg-foreground/[0.03] p-4 min-h-[5.5rem]" aria-live="polite">
                {active ? (
                  <>
                    <p className="font-semibold">
                      <code className="text-accent">{active.method}</code> · called by {CALLER_LABEL[active.caller]}
                      {active.payable && <span className="chip chip-warn ml-2">payable: {active.payable}</span>}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{active.effect}</p>
                    <p className="text-xs text-muted-foreground mt-1">Guard: {active.guard}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Press Play or Step to walk through “{scenario.title}”.</p>
                )}
              </div>
            </div>
          </Reveal>

          {stateInfo && (
            <Reveal>
              <div className="brand-card p-6">
                <h2 className="text-xl font-bold mb-1">{stateInfo.label}</h2>
                <p className="text-sm text-muted-foreground mb-3">{stateInfo.blurb}</p>
                {outgoing.length === 0 ? (
                  <p className="text-sm">Terminal state — nothing can leave it{selected === "completed" || selected === "rejected" ? ", except one client appeal inside the 7-day window." : "."}</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {outgoing.map((t) => (
                      <li key={t.id}>
                        <code className="text-accent">{t.method}</code> → <strong>{t.to}</strong> ({CALLER_LABEL[t.caller]}). {t.guard}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>
          )}

          <Reveal>
            <div className="brand-card p-6 overflow-x-auto">
              <h2 className="text-xl font-bold mb-4">All transitions</h2>
              <table className="w-full text-sm min-w-[40rem]">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-2 pr-3">Method</th>
                    <th className="pb-2 pr-3">From → To</th>
                    <th className="pb-2 pr-3">Caller</th>
                    <th className="pb-2">Guard</th>
                  </tr>
                </thead>
                <tbody>
                  {TRANSITIONS.map((t) => (
                    <tr key={t.id} className="border-t border-border/70 align-top">
                      <td className="py-2 pr-3"><code>{t.method}</code></td>
                      <td className="py-2 pr-3 whitespace-nowrap">{t.from} → {t.to}</td>
                      <td className="py-2 pr-3">{CALLER_LABEL[t.caller]}</td>
                      <td className="py-2 text-muted-foreground">{t.guard}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </main>
    </div>
  );
}

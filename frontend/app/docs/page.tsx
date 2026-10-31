"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { API, LIMITS, THREATS } from "@/lib/docs";

const SECTIONS = [
  { id: "overview", title: "Overview" },
  { id: "quickstart", title: "Quickstart" },
  { id: "lifecycle", title: "Lifecycle" },
  { id: "adjudication", title: "How adjudication works" },
  { id: "api", title: "Contract API" },
  { id: "limits", title: "Limits & constants" },
  { id: "security", title: "Security model" },
  { id: "frontend", title: "Frontend architecture" },
  { id: "testing", title: "Testing & live E2E" },
  { id: "migration", title: "Migrating from v1" },
  { id: "faq", title: "FAQ" },
];

const KIND_CHIP = { write: "chip-warn", payable: "chip-bad", view: "chip-info" } as const;

export default function DocsPage() {
  const [active, setActive] = useState("overview");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-90px 0px -65% 0px" },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-24 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[14rem_1fr] gap-10">
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1 text-sm" aria-label="Documentation sections">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Documentation</p>
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  aria-current={active === s.id ? "true" : undefined}
                  className={`block rounded-md px-3 py-1.5 transition-colors ${
                    active === s.id ? "bg-accent/15 text-accent font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </aside>

          <article className="prose-docs min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Foreman documentation</h1>
            <p>Everything about the v2 contract, the app and the test tooling in one place. The same material lives in <code>docs/</code> in the repository.</p>

            <h2 id="overview">Overview</h2>
            <p>
              Foreman is escrow plus adjudication for agent-to-agent work. A client locks GEN against a plain-English spec and acceptance criteria.
              A provider delivers one evidence URL. GenLayer validators independently fetch it and judge it against the order&rsquo;s own criteria; the
              escrow splits proportionally in the same transaction. No dispute desk, no admin key.
            </p>
            <ul>
              <li>Money leaves an order only through a consensus verdict, a client cancellation before any claim, or a post-deadline refund.</li>
              <li>Validators compare only the payout percentage (within 15 points), never free text.</li>
              <li>v2 adds enforced deadlines, an appeal window, abandon/extend, evidence hardening, a per-criterion checklist, an on-chain timeline, pagination, stats and a leaderboard.</li>
            </ul>

            <h2 id="quickstart">Quickstart</h2>
            <pre><code>{`# contract
pip install -r requirements.txt
genvm-lint check contracts/foreman.py
pytest tests/direct -q

# deploy to Studionet (chain 61999)
genlayer network   # choose studionet (https://studio.genlayer.com/api)
genlayer deploy

# frontend
cd frontend && cp .env.example .env.local   # set NEXT_PUBLIC_CONTRACT_ADDRESS
npm ci && npm run dev`}</code></pre>
            <p>Then open a work order from <Link href="/orders/new" className="text-accent hover:underline">New order</Link>, claim it from a second wallet, and submit a public evidence URL.</p>

            <h2 id="lifecycle">Lifecycle</h2>
            <p>
              Orders move <code>open → claimed → completed | rejected</code>, with <code>cancelled</code> and <code>expired</code> as refund exits. The{" "}
              <Link href="/lifecycle" className="text-accent hover:underline">interactive lifecycle</Link> page plays every scenario against the real transition table.
            </p>

            <h2 id="adjudication">How adjudication works</h2>
            <ul>
              <li><strong>Validation.</strong> The URL must be public http(s); the deadline must not have passed.</li>
              <li><strong>Fetch.</strong> The leader fetches the URL. Non-2xx or empty bodies revert (the provider can retry). The first 15,000 characters are used and truncation is recorded.</li>
              <li><strong>Judge.</strong> The model scores 0–100 against the acceptance criteria and lists a per-criterion checklist. Evidence, note and appeal context are each fenced with a content-derived tag.</li>
              <li><strong>Consensus.</strong> Each validator repeats the fetch and judgement. They agree when payouts differ by at most 15 points. If the leader reports a deterministic failure, validators agree only if they fail the same way.</li>
              <li><strong>Settlement.</strong> <code>accepted = payout ≥ 50</code>. The provider receives <code>escrow × payout ÷ 100</code>, the client the remainder, in the same transaction.</li>
              <li><strong>Appeal.</strong> Within 7 days the client may re-run once with context, attaching a fresh deposit equal to the escrow. The second verdict is final.</li>
            </ul>

            <h2 id="api">Contract API</h2>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr><th>Method</th><th>Kind</th><th>Arguments</th><th>Caller</th><th>What it does</th></tr>
                </thead>
                <tbody>
                  {API.map((m) => (
                    <tr key={m.name}>
                      <td><code>{m.name}</code>{m.since === "v2" && <span className="chip chip-ok ml-2">v2</span>}</td>
                      <td><span className={`chip ${KIND_CHIP[m.kind]}`}>{m.kind}</span></td>
                      <td><code>{m.args}</code></td>
                      <td>{m.caller}</td>
                      <td>{m.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3>Order object</h3>
            <pre><code>{`{
  id, client, provider, title, spec, acceptance_criteria,
  deliverable_url, deliverable_note, escrow_wei, deadline, status,
  payout_percent, verdict_reasoning, red_flags,
  criteria_results: [{criterion, met}],          // v2
  evidence_fingerprint, evidence_chars,          // v2: sha256[:16] of what the leader read
  evidence_truncated, appeal_used, appeal_deadline, extensions,
  created_at, claimed_at, delivered_at, resolved_at,
  timeline: [{t, event, actor, detail}]          // v2
}`}</code></pre>

            <h2 id="limits">Limits &amp; constants</h2>
            <table>
              <thead><tr><th>Constant</th><th>Value</th><th>Why</th></tr></thead>
              <tbody>
                {LIMITS.map((l) => (
                  <tr key={l.name}><td><code>{l.name}</code></td><td>{l.value}</td><td>{l.why}</td></tr>
                ))}
              </tbody>
            </table>

            <h2 id="security">Security model</h2>
            <p>Each defence is pinned by at least one test in <code>tests/direct/test_foreman_adversarial.py</code>.</p>
            <div className="overflow-x-auto">
              <table>
                <thead><tr><th>Threat</th><th>Defence</th><th>Test</th></tr></thead>
                <tbody>
                  {THREATS.map((t) => (
                    <tr key={t.threat}><td>{t.threat}</td><td>{t.defence}</td><td><code>{t.test}</code></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p><strong>Honest limits.</strong> A provider can still host evidence they control; the UI nudges toward independent sources. Validators are LLMs: the 15-point tolerance is a consensus aid, not a guarantee of identical judgement.</p>

            <h2 id="frontend">Frontend architecture</h2>
            <ul>
              <li>Next.js 16 static export, React 19, Tailwind v4, TanStack Query, <code>genlayer-js</code>.</li>
              <li><strong>Reads are cheap.</strong> The navbar and home use <code>get_stats</code> (O(1)); the orders list uses <code>get_orders_page</code>; the leaderboard uses <code>get_top_providers</code>. No page downloads the whole order book.</li>
              <li><strong>3D is optional and lazy.</strong> The Three.js escrow scene loads on idle only when WebGL exists, pauses when offscreen or hidden, caps pixel ratio, disposes on unmount, and renders one still frame under reduced-motion.</li>
              <li>The page background gradient no longer animates (it forced a full-viewport repaint every frame).</li>
              <li>Pages: <Link href="/" className="text-accent hover:underline">Home</Link>, <Link href="/dashboard" className="text-accent hover:underline">Dashboard</Link>, <Link href="/orders" className="text-accent hover:underline">Orders</Link>, order detail, <Link href="/lifecycle" className="text-accent hover:underline">Lifecycle</Link>, <Link href="/leaderboard" className="text-accent hover:underline">Leaderboard</Link>, provider profile, Docs, How it works.</li>
            </ul>

            <h2 id="testing">Testing &amp; live E2E</h2>
            <pre><code>{`pytest tests/direct -q                  # normal + adversarial + fuzz (no network)
cd frontend && npm test                 # unit + component tests
python scripts/e2e_live.py              # live Studionet run → reports/e2e-report.md`}</code></pre>
            <p>
              <code>scripts/e2e_live.py</code> deploys a fresh contract, runs the whole lifecycle through real consensus (happy path, rejection plus appeal, abandon,
              cancel, hostile-URL refusal, funds accounting) and writes a Markdown and JSON report. In a GitHub Codespace the included devcontainer installs
              everything; see <code>docs/E2E.md</code>.
            </p>

            <h2 id="migration">Migrating from v1</h2>
            <ul>
              <li>Redeploy: storage gained stats counters, so v2 is a new contract address. Update <code>NEXT_PUBLIC_CONTRACT_ADDRESS</code>.</li>
              <li>Provider records gain <code>abandoned</code>; expiry of a claimed order now counts there instead of <code>rejected</code>.</li>
              <li>Minimum escrow, field length caps and public-URL rules may reject inputs v1 accepted.</li>
              <li>Frontend readers tolerate missing v2 fields on old orders.</li>
            </ul>

            <h2 id="faq">FAQ</h2>
            <h3>Why a 15-point tolerance?</h3>
            <p>Two honest LLM runs rarely give the identical number. Tolerance lets consensus form on the decision while still rejecting a validator that disagrees materially.</p>
            <h3>What if the evidence URL changes after delivery?</h3>
            <p>The order stores an evidence fingerprint and length of what the leader read, so a later dispute can show whether the page changed.</p>
            <h3>Can GEN get stuck?</h3>
            <p>No state is terminal while escrow is held: open orders can be cancelled, claimed orders can be abandoned or expire, and delivered orders settle immediately.</p>
          </article>
        </div>
      </main>
    </div>
  );
}

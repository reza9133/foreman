import { describe, expect, it } from "vitest";
import { countdownTo, elapsedFraction, formatCountdown, timeAgo } from "@/lib/utils/time";
import {
  checklistScore,
  formatReliability,
  isSettled,
  isTerminal,
  payoutHistogram,
  shortAddress,
  statusCounts,
  timelineLabel,
} from "@/lib/utils/orders";
import { SCENARIOS, STATES, TRANSITIONS, transitionById, transitionsFrom, walk } from "@/lib/lifecycle";
import { API, LIMITS, THREATS } from "@/lib/docs";

const NOW = 1_800_000_000_000; // ms

describe("time utils", () => {
  it("counts down and floors at zero", () => {
    const c = countdownTo(NOW / 1000 + 90_061, NOW);
    expect(c).toMatchObject({ days: 1, hours: 1, minutes: 1, done: false });
    expect(countdownTo(NOW / 1000 - 5, NOW)).toMatchObject({ seconds: 0, done: true });
  });
  it("formats countdowns at every magnitude", () => {
    expect(formatCountdown(countdownTo(NOW / 1000 + 3 * 86400 + 4 * 3600, NOW))).toBe("3d 4h");
    expect(formatCountdown(countdownTo(NOW / 1000 + 5 * 3600 + 12 * 60, NOW))).toBe("5h 12m");
    expect(formatCountdown(countdownTo(NOW / 1000 + 9 * 60, NOW))).toBe("9m");
    expect(formatCountdown(countdownTo(NOW / 1000 + 20, NOW))).toBe("under a minute");
    expect(formatCountdown(countdownTo(NOW / 1000 - 1, NOW))).toBe("now");
  });
  it("timeAgo handles buckets, zero and future timestamps", () => {
    const t = NOW / 1000;
    expect(timeAgo(0, NOW)).toBe("—");
    expect(timeAgo(t + 100, NOW)).toBe("just now");
    expect(timeAgo(t - 12, NOW)).toBe("12s ago");
    expect(timeAgo(t - 300, NOW)).toBe("5m ago");
    expect(timeAgo(t - 3 * 3600, NOW)).toBe("3h ago");
    expect(timeAgo(t - 2 * 86400, NOW)).toBe("2d ago");
  });
  it("elapsedFraction is clamped and safe on bad ranges", () => {
    expect(elapsedFraction(100, 200, 150_000)).toBe(0.5);
    expect(elapsedFraction(100, 200, 0)).toBe(0);
    expect(elapsedFraction(100, 200, 10_000_000)).toBe(1);
    expect(elapsedFraction(200, 100, 150_000)).toBe(0);
    expect(elapsedFraction(0, 100, 50_000)).toBe(0);
  });
});

describe("order utils", () => {
  const orders = [
    { status: "open", payout_percent: 0 },
    { status: "completed", payout_percent: 100 },
    { status: "completed", payout_percent: 60 },
    { status: "rejected", payout_percent: 0 },
    { status: "rejected", payout_percent: 49 },
    { status: "cancelled", payout_percent: 0 },
  ] as const;

  it("counts every status, including zeros", () => {
    const c = statusCounts([...orders]);
    expect(c).toEqual({ open: 1, claimed: 0, completed: 2, rejected: 2, cancelled: 1, expired: 0 });
  });
  it("buckets payouts only for settled orders and clamps hostile values", () => {
    expect(payoutHistogram([...orders], 5)).toEqual([1, 0, 1, 1, 1]);
    expect(
      payoutHistogram(
        [
          { status: "completed", payout_percent: 5000 },
          { status: "rejected", payout_percent: -9 },
          { status: "completed", payout_percent: NaN },
        ],
        4,
      ),
    ).toEqual([2, 0, 0, 1]);
  });
  it("classifies settled and terminal states", () => {
    expect(isSettled({ status: "completed" })).toBe(true);
    expect(isSettled({ status: "cancelled" })).toBe(false);
    expect(isTerminal({ status: "expired" })).toBe(true);
    expect(isTerminal({ status: "claimed" })).toBe(false);
  });
  it("scores checklists", () => {
    expect(checklistScore(undefined)).toBeNull();
    expect(checklistScore([])).toBeNull();
    expect(checklistScore([{ met: true }, { met: false }, { met: true }, { met: true }])).toBe(0.75);
  });
  it("formats reliability and addresses", () => {
    expect(formatReliability(8750)).toBe("88%");
    expect(formatReliability(undefined)).toBe("—");
    expect(formatReliability(5000, false)).toBe("—");
    expect(shortAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234…5678");
    expect(shortAddress("0xabc")).toBe("0xabc");
    expect(shortAddress("")).toBe("—");
  });
  it("labels timeline events, falling back to the raw key", () => {
    expect(timelineLabel("settled")).toMatch(/consensus/);
    expect(timelineLabel("mystery")).toBe("mystery");
  });
});

describe("lifecycle data", () => {
  it("every scenario chains: each step starts where the previous one ended", () => {
    for (const s of SCENARIOS) {
      let state: string = "none";
      for (const id of s.steps) {
        const t = transitionById(id)!;
        expect(t, `${s.id}:${id}`).toBeDefined();
        expect(t.from, `${s.id}:${id} from`).toBe(state);
        state = t.to;
      }
    }
  });
  it("walk returns the state after each step", () => {
    expect(walk(["create", "claim", "submit"])).toEqual(["open", "claimed", "completed"]);
    expect(() => walk(["nope"])).toThrow();
  });
  it("terminal states have no outgoing transitions except the appeal on settled ones", () => {
    for (const s of STATES.filter((x) => x.terminal)) {
      const out = transitionsFrom(s.id).map((t) => t.id);
      if (s.id === "rejected") expect(out).toEqual(["appeal"]);
      else expect(out).toEqual([]);
    }
  });
  it("transition ids are unique", () => {
    const ids = TRANSITIONS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("docs data", () => {
  it("API method names are unique and the doc tables are populated", () => {
    const names = API.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
    expect(LIMITS.length).toBeGreaterThan(8);
    expect(THREATS.length).toBeGreaterThan(5);
  });
  it("every lifecycle method is documented in the API table", () => {
    for (const t of TRANSITIONS) expect(API.map((m) => m.name)).toContain(t.method);
  });
});

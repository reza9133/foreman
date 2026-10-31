import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readJson = (path: string) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const root = readJson("../../package.json");
const frontend = readJson("../package.json");
const lock = readJson("../../package-lock.json");

// Foreman targets the stable hosted Studionet (chain 61999). The v0.6
// release-candidate packages (genlayer-js 2.0 RC, Transaction Kit) belong to a
// different consensus deployment and must not come back.
const STABLE_GENLAYER_JS = "1.1.8";

describe("published GenLayer dependencies", () => {
  it("installs genlayer-js from npm at the stable release", () => {
    expect(frontend.dependencies["genlayer-js"]).toBe(STABLE_GENLAYER_JS);
    expect(lock.packages.frontend.dependencies["genlayer-js"]).toBe(STABLE_GENLAYER_JS);
    const entry = lock.packages["frontend/node_modules/genlayer-js"]
      ?? lock.packages["node_modules/genlayer-js"];
    expect(entry.version).toBe(STABLE_GENLAYER_JS);
    expect(entry.resolved).toMatch(/^https:\/\/registry\.npmjs\.org\//);
    expect(entry.integrity).toMatch(/^sha512-/);
  });

  it("shares the SDK release between deployment and the frontend", () => {
    expect(root.devDependencies["genlayer-js"])
      .toBe(frontend.dependencies["genlayer-js"]);
    expect(lock.packages[""].devDependencies["genlayer-js"])
      .toBe(root.devDependencies["genlayer-js"]);
  });

  it("uses no release-candidate GenLayer package", () => {
    const all = JSON.stringify({ root, frontend });
    expect(all).not.toMatch(/transaction-kit/);
    for (const [name, spec] of Object.entries<string>({
      ...root.devDependencies,
      ...frontend.dependencies,
    })) {
      if (name.includes("genlayer")) expect(spec).not.toMatch(/rc|dev|next/i);
    }
  });
});

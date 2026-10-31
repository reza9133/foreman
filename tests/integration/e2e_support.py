"""Reporting helpers for the live end-to-end suite.

`Reporter` records every check (name, outcome, tx hash, timing, detail) and
renders `reports/e2e-report.md` + `reports/e2e-report.json`, so a run in a
GitHub Codespace leaves a reviewable artifact that can be committed.
"""

from __future__ import annotations

import json
import os
import time
from contextlib import contextmanager
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path


@dataclass
class Check:
    scenario: str
    name: str
    ok: bool
    soft: bool = False
    detail: str = ""
    tx_hash: str = ""
    seconds: float = 0.0


@dataclass
class Reporter:
    network: str
    fixture_base: str
    contract_address: str = ""
    started: float = field(default_factory=time.time)
    checks: list = field(default_factory=list)
    notes: list = field(default_factory=list)
    _tx_seconds: float = 0.0

    @contextmanager
    def timed(self):
        t0 = time.time()
        try:
            yield
        finally:
            self._tx_seconds = time.time() - t0

    def check(self, scenario, name, condition, detail="", *, soft=False, receipt=None):
        """Record a check. A failed hard check also raises so pytest fails;
        a failed soft check (model-dependent behaviour) is only reported."""
        ok = bool(condition)
        self.checks.append(
            Check(scenario, name, ok, soft, str(detail), _hash(receipt), round(self._tx_seconds, 2))
        )
        self._tx_seconds = 0.0
        if not ok and not soft:
            raise AssertionError(f"[{scenario}] {name}: {detail}")

    def note(self, text):
        self.notes.append(text)

    # ------------------------------------------------------------------
    @property
    def hard_failures(self):
        return [c for c in self.checks if not c.ok and not c.soft]

    @property
    def soft_failures(self):
        return [c for c in self.checks if not c.ok and c.soft]

    def to_json(self):
        return {
            "network": self.network,
            "fixture_base": self.fixture_base,
            "contract_address": self.contract_address,
            "started_utc": datetime.fromtimestamp(self.started, timezone.utc).isoformat(),
            "duration_seconds": round(time.time() - self.started, 1),
            "total": len(self.checks),
            "passed": sum(1 for c in self.checks if c.ok),
            "hard_failures": len(self.hard_failures),
            "soft_failures": len(self.soft_failures),
            "notes": self.notes,
            "checks": [asdict(c) for c in self.checks],
        }

    def to_markdown(self):
        d = self.to_json()
        verdict = "PASS" if not self.hard_failures else "FAIL"
        lines = [
            "# Foreman live end-to-end report",
            "",
            f"**Result: {verdict}** — {d['passed']}/{d['total']} checks passed "
            f"({d['hard_failures']} hard failures, {d['soft_failures']} soft warnings)",
            "",
            f"- Network: `{d['network']}`",
            f"- Contract: `{d['contract_address'] or 'n/a'}`",
            f"- Evidence fixtures: `{d['fixture_base']}`",
            f"- Started (UTC): {d['started_utc']}",
            f"- Duration: {d['duration_seconds']} s",
            "",
            "Soft checks depend on LLM judgement (for example, whether a model resists a "
            "prompt-injection page). A soft failure is reported but does not fail the run.",
            "",
        ]
        scenarios = []
        for c in self.checks:
            if c.scenario not in scenarios:
                scenarios.append(c.scenario)
        for s in scenarios:
            lines += [f"## {s}", "", "| | Check | Detail | Tx | Time |", "|---|---|---|---|---|"]
            for c in (x for x in self.checks if x.scenario == s):
                icon = "✅" if c.ok else ("⚠️" if c.soft else "❌")
                tx = f"`{c.tx_hash[:12]}…`" if c.tx_hash else ""
                t = f"{c.seconds}s" if c.seconds else ""
                detail = c.detail.replace("|", "\\|").replace("\n", " ")[:160]
                lines.append(f"| {icon} | {c.name}{' *(soft)*' if c.soft else ''} | {detail} | {tx} | {t} |")
            lines.append("")
        if self.notes:
            lines += ["## Notes", ""] + [f"- {n}" for n in self.notes] + [""]
        return "\n".join(lines)

    def write(self, directory: str | os.PathLike = "reports"):
        out = Path(directory)
        out.mkdir(parents=True, exist_ok=True)
        (out / "e2e-report.json").write_text(json.dumps(self.to_json(), indent=2))
        (out / "e2e-report.md").write_text(self.to_markdown())


def _hash(receipt) -> str:
    if not receipt:
        return ""
    if isinstance(receipt, dict):
        for key in ("hash", "tx_hash", "transaction_hash", "id"):
            if receipt.get(key):
                return str(receipt[key])
    return ""


# ---------------------------------------------------------------------------
# Account funding
# ---------------------------------------------------------------------------

GEN = 10**18


def native_balance(client, address):
    """Best-effort native balance in wei; None when the RPC has no such call."""
    for getter in (
        lambda: client.get_balance(address),
        lambda: client.eth.get_balance(address),
    ):
        try:
            return int(getter())
        except Exception:
            continue
    return None


def ensure_funded(client, accounts, minimum=GEN // 2, topup=2 * GEN):
    """Make sure every account can pay for the run, funding it from the Studio
    faucet when it cannot.

    gltest's Studionet profile generates throw-away private keys on every run,
    so the accounts start with a zero balance and `create_order` (which attaches
    GEN) would fail. Studio exposes its faucet over JSON-RPC as
    `sim_fundAccount`; the hosted Studionet and a local Studio both serve it.

    Returns a list of human-readable notes for the report. Raises RuntimeError,
    naming the addresses, when an account is still short afterwards.
    """
    notes = []
    short = []
    for account in accounts:
        address = account.address
        before = native_balance(client, address)
        if before is not None and before >= minimum:
            continue
        try:
            client.provider.make_request(method="sim_fundAccount", params=[address, topup])
        except Exception as exc:  # faucet unavailable: report below
            notes.append(f"Faucet call for {address} failed: {exc}")
        after = native_balance(client, address)
        if after is not None and after < minimum:
            short.append(address)
        elif after is None:
            notes.append(f"Could not read the balance of {address}; assuming it is funded.")
        else:
            notes.append(f"Funded {address} from the Studio faucet ({before} -> {after} wei).")
    if short:
        raise RuntimeError(
            "These accounts have less than "
            f"{minimum / GEN:g} GEN and the Studio faucet did not fund them: "
            + ", ".join(short)
            + ". Fund them with the faucet button in https://studio.genlayer.com "
            "(import the private key) and re-run."
        )
    return notes

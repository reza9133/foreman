#!/usr/bin/env python3
"""Run the live end-to-end suite and leave a report in reports/.

    python scripts/e2e_live.py              # Studionet (needs internet; accounts are funded from the Studio faucet)
    python scripts/e2e_live.py --network localnet   # a local Studio at http://127.0.0.1:4000/api

Exit code is 0 only when every hard check passed.
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument(
        "--network",
        default="studionet",
        choices=["studionet", "localnet"],
        help="gltest network name (default: studionet)",
    )
    ap.add_argument("--fixture-base", help="public base URL of e2e/fixtures (default: this repo on GitHub)")
    ap.add_argument("--report-dir", default="reports")
    args = ap.parse_args()

    env = dict(os.environ, E2E_REPORT_DIR=args.report_dir)
    env["PYTHONPATH"] = os.pathsep.join(filter(None, [str(ROOT), env.get("PYTHONPATH", "")]))
    network = args.network
    if args.fixture_base:
        env["E2E_FIXTURE_BASE"] = args.fixture_base
    if network != "studionet":
        env.setdefault("E2E_NETWORK_LABEL", network)

    cmd = ["gltest", "tests/integration/test_e2e_live.py", "-v", "-s", "--network", network]
    code = subprocess.call(cmd, cwd=ROOT, env=env)

    report = ROOT / args.report_dir / "e2e-report.json"
    if report.exists():
        d = json.loads(report.read_text())
        print(
            f"\nE2E: {d['passed']}/{d['total']} checks passed, "
            f"{d['hard_failures']} hard failures, {d['soft_failures']} soft warnings"
        )
        print(f"Report: {ROOT / args.report_dir / 'e2e-report.md'}")
    else:
        print("No report was produced — the suite failed before the first check.", file=sys.stderr)
    return code


if __name__ == "__main__":
    sys.exit(main())

# Milestone: Foreman v2

What changed since the accepted submission, and where to see it.

| Area | Change | Evidence |
|---|---|---|
| Contract security | URL validation, content-hash prompt fences, caps, minimum escrow, deadline enforcement, appeal window | `contracts/foreman.py`, `tests/direct/test_foreman_adversarial.py` |
| Contract features | `abandon_claim`, `extend_deadline`, timeline, criteria checklist, stats, pagination, ranking | `tests/direct/test_foreman_v2.py`, `CHANGELOG.md` |
| Frontend | Eight-plus pages, WebGL scene, 3D tilt, charts, lifecycle explorer, in-app docs | `frontend/app/` |
| Performance | Paginated reads, O(1) stats, lazy Three.js, no page-level infinite animation | `docs/FRONTEND.md` |
| Tests | 30 → 211 direct tests, 43 frontend tests, fund-conservation fuzz | `docs/TESTING.md` |
| Live proof | One-command E2E with a committed report | `docs/E2E.md`, `reports/` |

The v2 storage layout differs from v1, so v2 is a new deployment.

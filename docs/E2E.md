# Live end-to-end run

`scripts/e2e_live.py` deploys a fresh Foreman v2 and runs nine scenarios
through real consensus on Studionet:

1. deploy and zeroed stats
2. happy path: create, claim, submit, accepted, reputation, timeline
3. rejection of irrelevant evidence, then appeal rules (wrong deposit, wrong caller, second appeal)
4. abandon and reclaim
5. deadline extension rules
6. cancel and refund
7. hostile and bad evidence (non-public URLs, 404) refused
8. prompt-injection page (soft checks: model behaviour)
9. views, pagination, top providers and funds accounting

Hard checks fail the run. Soft checks depend on LLM judgement; they are
reported as warnings and do not fail the run.

## Run it in a GitHub Codespace

1. Push this repo to GitHub **including `e2e/fixtures/`** (the contract
   fetches these files over HTTPS, so they must be public).
2. Open a Codespace on the repo. `.devcontainer/` installs everything.
3. Run:

   ```bash
   python scripts/e2e_live.py
   ```

   If your fork is not `reza9133/foreman`, point it at your own fixtures:

   ```bash
   python scripts/e2e_live.py --fixture-base https://raw.githubusercontent.com/<you>/<repo>/main/e2e/fixtures
   ```

4. Commit the report:

   ```bash
   git add reports/e2e-report.md reports/e2e-report.json
   git commit -m "docs: live E2E report"
   git push
   ```

Or use **Actions → Live E2E → Run workflow**, which does steps 3–4 for you.

The run takes several minutes, because each adjudication waits for validators
to run the model.

gltest generates three throw-away accounts for each Studionet run. The suite
funds them from the Studio faucet (`sim_fundAccount`) before the first
scenario. If the faucet refuses, the run stops with the account addresses:
import their keys in https://studio.genlayer.com, press the faucet button, and
re-run.

## Reading the report

`reports/e2e-report.md` has one table per scenario (check, detail, tx hash,
duration). `reports/e2e-report.json` carries the same data for tooling.

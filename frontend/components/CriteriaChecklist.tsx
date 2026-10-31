import { CheckCircle2, XCircle } from "lucide-react";
import type { CriterionResult } from "@/lib/contracts/types";
import { checklistScore } from "@/lib/utils/orders";

/** Per-criterion verdict checklist produced alongside the payout percentage. */
export function CriteriaChecklist({ results }: { results?: CriterionResult[] }) {
  const score = checklistScore(results);
  if (!results || score === null) return null;
  const met = results.filter((r) => r.met).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <p className="font-semibold">Criteria checklist</p>
        <p className="text-muted-foreground">
          {met} of {results.length} met
        </p>
      </div>
      <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden" aria-hidden="true">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-700"
          style={{ width: `${Math.round(score * 100)}%` }}
        />
      </div>
      <ul className="space-y-1.5">
        {results.map((r, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            {r.met ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-700" aria-label="met" />
            ) : (
              <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-700" aria-label="not met" />
            )}
            <span className={r.met ? "" : "text-muted-foreground"}>{r.criterion}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

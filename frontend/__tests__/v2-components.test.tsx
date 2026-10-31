import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StatusDonut } from "@/components/charts/StatusDonut";
import { PayoutHistogram } from "@/components/charts/PayoutHistogram";
import { VerdictGauge } from "@/components/charts/VerdictGauge";
import { CriteriaChecklist } from "@/components/CriteriaChecklist";
import { OrderTimeline } from "@/components/OrderTimeline";
import { StatusBadge } from "@/components/StatusBadge";
import { LifecycleDiagram } from "@/components/LifecycleDiagram";
import { Countdown } from "@/components/Countdown";

afterEach(cleanup);

describe("charts", () => {
  it("donut shows the total and every legend row", () => {
    render(<StatusDonut counts={{ open: 2, claimed: 1, completed: 3, rejected: 0, cancelled: 0, expired: 1 }} />);
    expect(screen.getByRole("img", { name: "7 orders by status" })).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });
  it("donut with zero orders does not divide by zero", () => {
    const { container } = render(<StatusDonut counts={{ open: 0, claimed: 0, completed: 0, rejected: 0, cancelled: 0, expired: 0 }} />);
    expect(container.innerHTML).not.toContain("NaN");
  });
  it("histogram renders one bar per bin with counts", () => {
    render(<PayoutHistogram bins={[1, 0, 4]} />);
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("0–33%")).toBeInTheDocument();
  });
  it("gauge reports accept/reject around the 50% line and clamps junk", () => {
    const { rerender } = render(<VerdictGauge percent={72} />);
    expect(screen.getByRole("img", { name: "Verdict 72% — accepted" })).toBeInTheDocument();
    rerender(<VerdictGauge percent={49} />);
    expect(screen.getByRole("img", { name: "Verdict 49% — rejected" })).toBeInTheDocument();
    rerender(<VerdictGauge percent={9999} />);
    expect(screen.getByRole("img", { name: "Verdict 100% — accepted" })).toBeInTheDocument();
    rerender(<VerdictGauge percent={Number.NaN} />);
    expect(screen.getByRole("img", { name: "Verdict 0% — rejected" })).toBeInTheDocument();
  });
});

describe("order widgets", () => {
  it("checklist renders met / unmet items and a summary, and nothing when empty", () => {
    const { container, rerender } = render(
      <CriteriaChecklist results={[{ criterion: "valid JSON", met: true }, { criterion: "10+ items", met: false }]} />,
    );
    expect(screen.getByText("1 of 2 met")).toBeInTheDocument();
    expect(screen.getByLabelText("met")).toBeInTheDocument();
    expect(screen.getByLabelText("not met")).toBeInTheDocument();
    rerender(<CriteriaChecklist results={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("timeline lists events in order and handles v1 orders without one", () => {
    const { rerender } = render(
      <OrderTimeline
        entries={[
          { t: 1_800_000_000, event: "created", actor: "0x1111111111111111111111111111111111111111", detail: "escrow=1" },
          { t: 1_800_000_100, event: "settled", actor: "consensus", detail: "80% -> completed" },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Order opened");
    expect(items[1]).toHaveTextContent("80% -> completed");
    rerender(<OrderTimeline entries={[]} />);
    expect(screen.getByText(/created by a v1 contract/)).toBeInTheDocument();
  });
  it("status badges use accessible text, not colour alone", () => {
    render(<StatusBadge status="claimed" />);
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });
  it("countdown shows the passed label for a past target", async () => {
    render(<Countdown target={1} doneLabel="closed" />);
    expect(await screen.findByText("closed")).toBeInTheDocument();
  });
});

describe("lifecycle diagram", () => {
  it("renders all six states and highlights the active edge", () => {
    const { container } = render(<LifecycleDiagram currentState="claimed" activeEdges={["claim"]} />);
    for (const label of ["Open", "Claimed", "Completed", "Rejected", "Cancelled", "Expired"]) {
      expect(screen.getByLabelText(`${label} state`)).toBeInTheDocument();
    }
    expect(container.querySelectorAll("path[stroke-dasharray='7 5']").length).toBe(1);
  });
});

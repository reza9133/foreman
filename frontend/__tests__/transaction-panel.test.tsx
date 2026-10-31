import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ submitWrite: vi.fn() }));

vi.mock("../lib/genlayer/transactions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/genlayer/transactions")>()),
  submitWrite: mocks.submitWrite,
}));

import { TransactionPanel } from "../components/TransactionPanel";
import type { TxRequest } from "../lib/genlayer/transactions";

const tx: TxRequest = {
  kind: "write",
  address: "0x1234567890123456789012345678901234567890",
  method: "create_order",
  args: ["Scrape competitor pricing", "Spec", "Criteria", 3],
};
const account = "0x0000000000000000000000000000000000000001";

afterEach(() => {
  cleanup();
  mocks.submitWrite.mockReset();
});

describe("TransactionPanel", () => {
  it("shows what is about to be signed, including the attached GEN", () => {
    render(<TransactionPanel tx={tx} account={account} userValue={10n ** 18n} network="Studionet" />);

    expect(screen.getByText("create_order")).toBeInTheDocument();
    expect(screen.getByText("Scrape competitor pricing")).toBeInTheDocument();
    expect(screen.getByText("1 GEN")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign and submit" })).toBeEnabled();
  });

  it("submits with the attached value and reports success", async () => {
    mocks.submitWrite.mockResolvedValue({ phase: "decided", successful: true, hash: "0xabc" });
    const onDone = vi.fn();
    render(<TransactionPanel tx={tx} account={account} userValue={5n} network="Studionet" onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: "Sign and submit" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ successful: true })));
    expect(mocks.submitWrite).toHaveBeenCalledWith(tx, account, 5n, expect.any(Function));
    expect(screen.getByText(/Accepted by consensus/)).toBeInTheDocument();
  });

  it("shows the error and lets the person retry after a failure", async () => {
    mocks.submitWrite.mockResolvedValue({ phase: "failed", successful: false, error: "You rejected the request in your wallet." });
    render(<TransactionPanel tx={tx} account={account} network="Studionet" />);

    fireEvent.click(screen.getByRole("button", { name: "Sign and submit" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("rejected");
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  });
});

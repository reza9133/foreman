import { describe, expect, it } from "vitest";
import { describeTxError, isSuccessfulReceipt } from "../lib/genlayer/transactions";

describe("isSuccessfulReceipt", () => {
  it("accepts an ACCEPTED or FINALIZED transaction whose leader succeeded", () => {
    for (const statusName of ["ACCEPTED", "FINALIZED"]) {
      expect(
        isSuccessfulReceipt({
          statusName,
          consensus_data: { leader_receipt: [{ execution_result: "SUCCESS" }] },
        }),
      ).toBe(true);
    }
    expect(isSuccessfulReceipt({ status: 7 })).toBe(true);
  });

  it("treats an accepted transaction that reverted as a failure", () => {
    expect(
      isSuccessfulReceipt({
        statusName: "ACCEPTED",
        consensus_data: { leader_receipt: [{ execution_result: "ERROR" }] },
      }),
    ).toBe(false);
    expect(
      isSuccessfulReceipt({ statusName: "ACCEPTED", txExecutionResultName: "FINISHED_WITH_ERROR" }),
    ).toBe(false);
  });

  it("rejects transactions that consensus did not accept", () => {
    expect(isSuccessfulReceipt({ statusName: "UNDETERMINED" })).toBe(false);
    expect(isSuccessfulReceipt({ status: 1 })).toBe(false);
    expect(isSuccessfulReceipt(null)).toBe(false);
  });
});

describe("describeTxError", () => {
  it("explains a rejected wallet request", () => {
    expect(describeTxError({ code: 4001 })).toMatch(/rejected/i);
  });

  it("falls back to the error message", () => {
    expect(describeTxError(new Error("boom"))).toBe("boom");
    expect(describeTxError(undefined)).toMatch(/could not be submitted/i);
  });
});

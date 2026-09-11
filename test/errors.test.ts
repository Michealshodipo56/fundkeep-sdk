import { describe, expect, it } from "vitest";
import { FundKeepErrorCode, parseContractError } from "../src/errors.js";

describe("parseContractError", () => {
  it("maps a known contract error code", () => {
    const err = parseContractError(
      new Error("HostError: Error(Contract, #4)")
    );
    expect(err.code).toBe(FundKeepErrorCode.Unauthorized);
    expect(err.message).toContain("Unauthorized");
  });

  it("maps each documented error code", () => {
    const cases: [number, FundKeepErrorCode][] = [
      [1, FundKeepErrorCode.GoalNotFound],
      [2, FundKeepErrorCode.NotUnlocked],
      [3, FundKeepErrorCode.AlreadyWithdrawn],
      [5, FundKeepErrorCode.InvalidAmount],
      [6, FundKeepErrorCode.InvalidDeadline],
    ];
    for (const [n, code] of cases) {
      expect(parseContractError(`Error(Contract, #${n})`).code).toBe(code);
    }
  });

  it("leaves code undefined for an unrecognized error", () => {
    const err = parseContractError("simulation failed: some other reason");
    expect(err.code).toBeUndefined();
    expect(err.message).toContain("some other reason");
  });

  it("leaves code undefined for an out-of-range error number", () => {
    const err = parseContractError("Error(Contract, #99)");
    expect(err.code).toBeUndefined();
  });
});

import {
  Account,
  Contract,
  Keypair,
  Networks,
  StrKey,
  nativeToScVal,
  rpc,
} from "@stellar/stellar-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FundKeepClient } from "../src/client.js";

const CONTRACT_ID = StrKey.encodeContract(new Uint8Array(32).fill(1));
const OWNER = Keypair.random().publicKey();
const TOKEN = StrKey.encodeContract(new Uint8Array(32).fill(2));

function client() {
  return new FundKeepClient({
    contractId: CONTRACT_ID,
    rpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: Networks.TESTNET,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FundKeepClient transaction building", () => {
  it("buildCreateGoalTx calls create_goal with the right args", async () => {
    const callSpy = vi.spyOn(Contract.prototype, "call");
    vi.spyOn(rpc.Server.prototype, "getAccount").mockResolvedValue(
      new Account(OWNER, "100")
    );
    vi.spyOn(rpc.Server.prototype, "prepareTransaction").mockImplementation(
      async (tx) => tx as any
    );

    await client().buildCreateGoalTx({
      owner: OWNER,
      token: TOKEN,
      targetAmount: 100_000_000n,
      deadline: 1_800_000_000n,
    });

    expect(callSpy).toHaveBeenCalledTimes(1);
    const [method, ownerArg, tokenArg, targetArg, deadlineArg] =
      callSpy.mock.calls[0];
    expect(method).toBe("create_goal");
    expect(ownerArg).toEqual(nativeToScVal(OWNER, { type: "address" }));
    expect(tokenArg).toEqual(nativeToScVal(TOKEN, { type: "address" }));
    expect(targetArg).toEqual(nativeToScVal(100_000_000n, { type: "i128" }));
    expect(deadlineArg).toEqual(
      nativeToScVal(1_800_000_000n, { type: "u64" })
    );
  });

  it("buildDepositTx calls deposit with caller, goal_id, amount", async () => {
    const callSpy = vi.spyOn(Contract.prototype, "call");
    vi.spyOn(rpc.Server.prototype, "getAccount").mockResolvedValue(
      new Account(OWNER, "100")
    );
    vi.spyOn(rpc.Server.prototype, "prepareTransaction").mockImplementation(
      async (tx) => tx as any
    );

    await client().buildDepositTx({ caller: OWNER, goalId: 3, amount: 50n });

    const [method, callerArg, goalIdArg, amountArg] = callSpy.mock.calls[0];
    expect(method).toBe("deposit");
    expect(callerArg).toEqual(nativeToScVal(OWNER, { type: "address" }));
    expect(goalIdArg).toEqual(nativeToScVal(3, { type: "u32" }));
    expect(amountArg).toEqual(nativeToScVal(50n, { type: "i128" }));
  });

  it("buildCheckDeadlineTx calls check_deadline with only goal_id", async () => {
    const callSpy = vi.spyOn(Contract.prototype, "call");
    vi.spyOn(rpc.Server.prototype, "getAccount").mockResolvedValue(
      new Account(OWNER, "100")
    );
    vi.spyOn(rpc.Server.prototype, "prepareTransaction").mockImplementation(
      async (tx) => tx as any
    );

    await client().buildCheckDeadlineTx({ source: OWNER, goalId: 7 });

    expect(callSpy.mock.calls[0]).toEqual([
      "check_deadline",
      nativeToScVal(7, { type: "u32" }),
    ]);
  });

  it("buildWithdrawTx calls withdraw with caller and goal_id", async () => {
    const callSpy = vi.spyOn(Contract.prototype, "call");
    vi.spyOn(rpc.Server.prototype, "getAccount").mockResolvedValue(
      new Account(OWNER, "100")
    );
    vi.spyOn(rpc.Server.prototype, "prepareTransaction").mockImplementation(
      async (tx) => tx as any
    );

    await client().buildWithdrawTx({ caller: OWNER, goalId: 2 });

    const [method, callerArg, goalIdArg] = callSpy.mock.calls[0];
    expect(method).toBe("withdraw");
    expect(callerArg).toEqual(nativeToScVal(OWNER, { type: "address" }));
    expect(goalIdArg).toEqual(nativeToScVal(2, { type: "u32" }));
  });
});

describe("FundKeepClient.getGoal", () => {
  it("decodes a successful simulation into SavingsGoalOnChain", async () => {
    const goal = {
      owner: OWNER,
      token: TOKEN,
      target_amount: 100_000_000n,
      current_amount: 40_000_000n,
      deadline: 1_800_000_000n,
      unlocked: false,
      withdrawn: false,
    };

    vi.spyOn(rpc.Server.prototype, "simulateTransaction").mockResolvedValue({
      latestLedger: 1,
      result: { retval: nativeToScVal(goal), auth: [] },
    } as any);

    const result = await client().getGoal(3);

    expect(result).toEqual({
      goalId: 3,
      owner: OWNER,
      token: TOKEN,
      targetAmount: 100_000_000n,
      currentAmount: 40_000_000n,
      deadline: 1_800_000_000n,
      unlocked: false,
      withdrawn: false,
    });
  });

  it("throws a parsed FundKeepError when the simulation errors", async () => {
    vi.spyOn(rpc.Server.prototype, "simulateTransaction").mockResolvedValue({
      latestLedger: 1,
      error: "HostError: Error(Contract, #1)",
    } as any);

    await expect(client().getGoal(999)).rejects.toMatchObject({
      code: 1,
    });
  });
});

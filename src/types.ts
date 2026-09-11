/** Mirrors the contract's `SavingsGoal` struct, decoded to native JS types. */
export interface SavingsGoalOnChain {
  goalId: number;
  owner: string;
  token: string;
  targetAmount: bigint;
  currentAmount: bigint;
  deadline: bigint;
  unlocked: boolean;
  withdrawn: boolean;
}

export type GoalStatus = "LOCKED" | "UNLOCKED" | "WITHDRAWN";

export function deriveGoalStatus(
  goal: Pick<SavingsGoalOnChain, "unlocked" | "withdrawn">
): GoalStatus {
  if (goal.withdrawn) return "WITHDRAWN";
  if (goal.unlocked) return "UNLOCKED";
  return "LOCKED";
}

/**
 * Matches the shape of Freighter's (and other SEP-43 wallets') signing
 * function, so it can be passed straight through from `@stellar/freighter-api`.
 */
export type SignTransaction = (
  xdr: string,
  opts?: {
    networkPassphrase?: string;
    address?: string;
    submit?: boolean;
    submitUrl?: string;
  }
) => Promise<{
  signedTxXdr: string;
  signerAddress?: string;
  error?: { message: string; code: number };
}>;

export interface FundKeepClientOptions {
  contractId: string;
  rpcUrl: string;
  networkPassphrase: string;
  /** Defaults to false; set true only for a local/http-only RPC endpoint. */
  allowHttp?: boolean;
}

/** Result of a successfully confirmed write transaction. */
export interface SentTransactionResult<T> {
  hash: string;
  value: T;
}

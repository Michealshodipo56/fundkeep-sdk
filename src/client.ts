import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";
import type { Transaction } from "@stellar/stellar-sdk";

import { DEFAULT_TX_TIMEOUT_SECONDS, NULL_ACCOUNT } from "./constants.js";
import { parseContractError } from "./errors.js";
import type {
  FundKeepClientOptions,
  SavingsGoalOnChain,
  SentTransactionResult,
  SignTransaction,
} from "./types.js";

/**
 * Builds unsigned transactions against the FundKeep Soroban contract and
 * helps get them signed and submitted. Signing is intentionally kept out of
 * this class — callers supply a `SignTransaction` function (Freighter's
 * `signTransaction` matches this shape directly).
 */
export class FundKeepClient {
  private readonly server: rpc.Server;
  private readonly contract: Contract;
  private readonly networkPassphrase: string;

  constructor(private readonly options: FundKeepClientOptions) {
    this.server = new rpc.Server(options.rpcUrl, {
      allowHttp: options.allowHttp ?? false,
    });
    this.contract = new Contract(options.contractId);
    this.networkPassphrase = options.networkPassphrase;
  }

  async buildCreateGoalTx(params: {
    owner: string;
    token: string;
    targetAmount: bigint;
    deadline: bigint;
  }): Promise<Transaction> {
    return this.buildTx(params.owner, "create_goal", [
      new Address(params.owner).toScVal(),
      new Address(params.token).toScVal(),
      nativeToScVal(params.targetAmount, { type: "i128" }),
      nativeToScVal(params.deadline, { type: "u64" }),
    ]);
  }

  async buildDepositTx(params: {
    caller: string;
    goalId: number;
    amount: bigint;
  }): Promise<Transaction> {
    return this.buildTx(params.caller, "deposit", [
      new Address(params.caller).toScVal(),
      nativeToScVal(params.goalId, { type: "u32" }),
      nativeToScVal(params.amount, { type: "i128" }),
    ]);
  }

  /**
   * `check_deadline` needs no auth, but still needs a fee-paying source
   * account to submit the transaction at all — pass any funded address.
   */
  async buildCheckDeadlineTx(params: {
    source: string;
    goalId: number;
  }): Promise<Transaction> {
    return this.buildTx(params.source, "check_deadline", [
      nativeToScVal(params.goalId, { type: "u32" }),
    ]);
  }

  async buildWithdrawTx(params: {
    caller: string;
    goalId: number;
  }): Promise<Transaction> {
    return this.buildTx(params.caller, "withdraw", [
      new Address(params.caller).toScVal(),
      nativeToScVal(params.goalId, { type: "u32" }),
    ]);
  }

  /** Read-only. Does not require a connected wallet or a funded account. */
  async getGoal(goalId: number): Promise<SavingsGoalOnChain> {
    const account = new Account(NULL_ACCOUNT, "0");
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        this.contract.call("get_goal", nativeToScVal(goalId, { type: "u32" }))
      )
      .setTimeout(DEFAULT_TX_TIMEOUT_SECONDS)
      .build();

    const sim = await this.server.simulateTransaction(tx);

    if (rpc.Api.isSimulationError(sim)) {
      throw parseContractError(sim.error);
    }

    const retval = (sim as rpc.Api.SimulateTransactionSuccessResponse).result
      ?.retval;
    if (!retval) {
      throw new Error(`get_goal(${goalId}) simulation returned no result`);
    }

    const decoded = scValToNative(retval) as Record<string, unknown>;

    return {
      goalId,
      owner: decoded.owner as string,
      token: decoded.token as string,
      targetAmount: decoded.target_amount as bigint,
      currentAmount: decoded.current_amount as bigint,
      deadline: decoded.deadline as bigint,
      unlocked: decoded.unlocked as boolean,
      withdrawn: decoded.withdrawn as boolean,
    };
  }

  /**
   * Signs a transaction built by one of the `buildXTx` methods and submits
   * it, polling until it lands on the ledger.
   */
  async signAndSend<T = unknown>(
    tx: Transaction,
    signTransaction: SignTransaction,
    opts?: { address?: string }
  ): Promise<SentTransactionResult<T>> {
    const { signedTxXdr, error } = await signTransaction(tx.toXDR(), {
      networkPassphrase: this.networkPassphrase,
      address: opts?.address,
    });

    if (error) {
      throw new Error(error.message);
    }

    const signedTx = TransactionBuilder.fromXDR(
      signedTxXdr,
      this.networkPassphrase
    ) as Transaction;

    const sendResult = await this.server.sendTransaction(signedTx);

    if (sendResult.status === "ERROR") {
      throw parseContractError(
        sendResult.errorResult?.toString() ?? "Transaction submission failed"
      );
    }

    const result = await this.server.pollTransaction(sendResult.hash);

    if (result.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
      throw parseContractError(JSON.stringify(result));
    }

    const value = result.returnValue
      ? (scValToNative(result.returnValue) as T)
      : (undefined as T);

    return { hash: sendResult.hash, value };
  }

  private async buildTx(
    source: string,
    method: string,
    args: xdr.ScVal[]
  ): Promise<Transaction> {
    const account = await this.server.getAccount(source);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(DEFAULT_TX_TIMEOUT_SECONDS)
      .build();

    return this.server.prepareTransaction(tx);
  }
}

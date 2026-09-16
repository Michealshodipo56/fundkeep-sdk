# @fundkeep/sdk

TypeScript client for the [FundKeep](https://github.com/Michealshodipo56/fundkeep-app) Soroban savings-goal contract ([fundkeep-contract](https://github.com/Michealshodipo56/fundkeep-contract)). Builds unsigned transactions, leaves signing to the caller's wallet, and helps submit and decode the result.

Not published to npm — install directly from GitHub:

```bash
npm install github:Michealshodipo56/fundkeep-sdk
```

## Requirements

- Node.js v22.12+

## Usage

```ts
import { FundKeepClient, toStroops, fromStroops } from "@fundkeep/sdk";
import { signTransaction } from "@stellar/freighter-api";
import { Networks } from "@stellar/stellar-sdk";

const client = new FundKeepClient({
  contractId: process.env.NEXT_PUBLIC_CONTRACT_ID!,
  rpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL!,
  networkPassphrase: Networks.TESTNET,
});

// Read (no wallet needed)
const goal = await client.getGoal(0);
console.log(fromStroops(goal.currentAmount), "/", fromStroops(goal.targetAmount));

// Write (needs a connected wallet)
const tx = await client.buildDepositTx({
  caller: walletAddress,
  goalId: 0,
  amount: toStroops("25.5"),
});
const { hash, value } = await client.signAndSend(tx, signTransaction, {
  address: walletAddress,
});
```

## API

- `buildCreateGoalTx({ owner, token, targetAmount, deadline })`
- `buildDepositTx({ caller, goalId, amount })`
- `buildCheckDeadlineTx({ source, goalId })`
- `buildWithdrawTx({ caller, goalId })`
- `getGoal(goalId)` — read-only, no wallet or funded account required
- `signAndSend(tx, signTransaction, opts?)` — signs with a Freighter-shaped `signTransaction`, submits, and polls until confirmed
- `toStroops(amount)` / `fromStroops(stroops)` — USDC's 7-decimal conversion
- `parseContractError(source)` — turns an RPC error into a typed `FundKeepError` with a `.code` matching [`fundkeep-contract`'s error enum](https://github.com/Michealshodipo56/fundkeep-contract/blob/main/contracts/fundkeep/src/errors.rs)

## Development

```bash
npm install
npm run build
npm test
npm run typecheck
```

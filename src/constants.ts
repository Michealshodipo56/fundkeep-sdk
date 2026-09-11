import { Networks } from "@stellar/stellar-sdk";

/** USDC on Soroban uses 7 decimal places, same as native XLM. */
export const USDC_DECIMALS = 7;

export const DEFAULT_TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";
export const DEFAULT_TESTNET_NETWORK_PASSPHRASE = Networks.TESTNET;

/** How long a built transaction stays valid for signing, in seconds. */
export const DEFAULT_TX_TIMEOUT_SECONDS = 60;

/**
 * An address that is syntactically valid but exists nowhere on any Stellar
 * network. Used as the source account for read-only simulate-only calls
 * (e.g. `getGoal`) so a real funded account isn't required just to read
 * state.
 */
export const NULL_ACCOUNT =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

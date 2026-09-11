import { USDC_DECIMALS } from "./constants.js";

/**
 * Converts a human-readable USDC amount (e.g. `12.5`) into the integer
 * stroops representation the contract expects (`125000000n` at 7 decimals).
 * Parses the input as a decimal string internally to avoid floating-point
 * precision loss on larger amounts.
 */
export function toStroops(amount: number | string): bigint {
  const str = typeof amount === "number" ? amount.toString() : amount;
  if (!/^-?\d+(\.\d+)?$/.test(str)) {
    throw new Error(`Invalid decimal amount: ${str}`);
  }

  const negative = str.startsWith("-");
  const unsigned = negative ? str.slice(1) : str;
  const [whole, fraction = ""] = unsigned.split(".");

  if (fraction.length > USDC_DECIMALS) {
    throw new Error(
      `Amount has more than ${USDC_DECIMALS} decimal places: ${str}`
    );
  }

  const paddedFraction = fraction.padEnd(USDC_DECIMALS, "0");
  const stroops = BigInt(whole + paddedFraction);

  return negative ? -stroops : stroops;
}

/**
 * Converts an integer stroops amount from the contract back into a
 * human-readable decimal number (e.g. `125000000n` -> `12.5`).
 */
export function fromStroops(stroops: bigint): number {
  const negative = stroops < 0n;
  const abs = negative ? -stroops : stroops;

  const divisor = 10n ** BigInt(USDC_DECIMALS);
  const whole = abs / divisor;
  const fraction = abs % divisor;

  const value = Number(whole) + Number(fraction) / Number(divisor);
  return negative ? -value : value;
}

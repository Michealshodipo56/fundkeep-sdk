/** Mirrors `contracts/fundkeep/src/errors.rs` in the fundkeep-contract repo. */
export enum FundKeepErrorCode {
  GoalNotFound = 1,
  NotUnlocked = 2,
  AlreadyWithdrawn = 3,
  Unauthorized = 4,
  InvalidAmount = 5,
  InvalidDeadline = 6,
}

const ERROR_NAMES: Record<FundKeepErrorCode, string> = {
  [FundKeepErrorCode.GoalNotFound]: "GoalNotFound",
  [FundKeepErrorCode.NotUnlocked]: "NotUnlocked",
  [FundKeepErrorCode.AlreadyWithdrawn]: "AlreadyWithdrawn",
  [FundKeepErrorCode.Unauthorized]: "Unauthorized",
  [FundKeepErrorCode.InvalidAmount]: "InvalidAmount",
  [FundKeepErrorCode.InvalidDeadline]: "InvalidDeadline",
};

export class FundKeepError extends Error {
  constructor(
    public readonly code: FundKeepErrorCode | undefined,
    message: string
  ) {
    super(message);
    this.name = "FundKeepError";
  }
}

const CONTRACT_ERROR_PATTERN = /Error\(Contract,\s*#(\d+)\)/;

/**
 * Contract panics surface from the RPC as a diagnostic string containing
 * `Error(Contract, #N)`. Parses that back into a named FundKeepError so
 * callers can branch on `error.code` instead of matching strings.
 */
export function parseContractError(source: unknown): FundKeepError {
  const message = source instanceof Error ? source.message : String(source);
  const match = message.match(CONTRACT_ERROR_PATTERN);

  if (!match) {
    return new FundKeepError(undefined, message);
  }

  const code = Number(match[1]) as FundKeepErrorCode;
  const name = ERROR_NAMES[code];

  return new FundKeepError(
    name ? code : undefined,
    name ? `FundKeep contract error: ${name}` : message
  );
}

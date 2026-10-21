import { createHash, randomBytes } from "node:crypto";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomBase62(length: number): string {
  // Rejection sampling keeps every character equally likely.
  let out = "";
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < 248 && out.length < length) out += BASE62[byte % 62];
    }
  }
  return out;
}

export const API_TOKEN_PATTERN = /^sfi_[0-9A-Za-z]{32}$/;

// Tokens are only ever shown once; the database keeps their hash.
export function newApiToken(): string {
  return `sfi_${randomBase62(32)}`;
}

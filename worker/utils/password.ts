// Web Crypto API を使用した PBKDF2 パスワードハッシュ
import { PASSWORD_HASH } from "../../shared/constants";

const { ITERATIONS, KEY_LENGTH_BITS, SALT_LENGTH_BYTES, HASH } = PASSWORD_HASH;

// パスワードをハッシュ化
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: HASH,
    },
    keyMaterial,
    KEY_LENGTH_BITS
  );

  const hashArray = new Uint8Array(derivedBits);
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const hashHex = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${saltHex}:${hashHex}`;
}

// パスワードを検証
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // ハッシュ形式の検証（salt:hash の形式）
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;

  const [saltHex, hashHex] = parts;
  if (!saltHex || !hashHex) return false;

  // saltHexが正しい16進数文字列か検証
  const saltBytes = saltHex.match(/.{2}/g);
  if (!saltBytes || saltBytes.length !== SALT_LENGTH_BYTES) return false;

  const salt = new Uint8Array(saltBytes.map((byte) => parseInt(byte, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: HASH,
    },
    keyMaterial,
    KEY_LENGTH_BITS
  );

  const computedHashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedHashHex === hashHex;
}

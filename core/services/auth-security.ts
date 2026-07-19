import crypto from "crypto";
import { config } from "../config/env";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_KEY_LENGTH = 64;

export interface AuthTokenPayload {
  id: string;
  username: string;
  exp: number;
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${key}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [scheme, salt, expectedKey] = storedHash.split("$");
  if (scheme !== "scrypt" || !salt || !expectedKey) {
    return false;
  }

  const actualKey = crypto.scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");
  return timingSafeEqualStrings(actualKey, expectedKey);
}

export function verifyLegacyBase64Password(password: string, storedHash: string): boolean {
  const legacyHash = Buffer.from(password).toString("base64");
  return timingSafeEqualStrings(legacyHash, storedHash);
}

export function createAuthToken(payload: Pick<AuthTokenPayload, "id" | "username">): string {
  const header = { alg: "HS256", typ: "JWT" };
  const body: AuthTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const unsignedToken = `${encodedHeader}.${encodedBody}`;
  const signature = crypto
    .createHmac("sha256", config.jwtSecret)
    .update(unsignedToken)
    .digest();

  return `${unsignedToken}.${base64UrlEncode(signature)}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed token.");
  }

  const [encodedHeader, encodedBody, encodedSignature] = parts;
  const expectedSignature = base64UrlEncode(
    crypto
      .createHmac("sha256", config.jwtSecret)
      .update(`${encodedHeader}.${encodedBody}`)
      .digest()
  );

  if (!timingSafeEqualStrings(encodedSignature, expectedSignature)) {
    throw new Error("Invalid token signature.");
  }

  const header = JSON.parse(base64UrlDecode(encodedHeader).toString("utf-8"));
  if (header.alg !== "HS256" || header.typ !== "JWT") {
    throw new Error("Unsupported token header.");
  }

  const payload = JSON.parse(base64UrlDecode(encodedBody).toString("utf-8")) as AuthTokenPayload;
  if (!payload.id || !payload.username || !payload.exp) {
    throw new Error("Invalid token payload.");
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired.");
  }

  return payload;
}

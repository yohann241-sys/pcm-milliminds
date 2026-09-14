import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "mm_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

const encode = (value: string) => Buffer.from(value).toString("base64url");

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET doit contenir au moins 32 caractères.");
  }
  return value;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createParticipantToken() {
  return randomBytes(32).toString("base64url");
}

export function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createAdminSession(email: string) {
  const payload = encode(
    JSON.stringify({
      sub: email,
      role: "admin",
      exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
    }),
  );
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readAdminSession(request: Request) {
  const cookies = Object.fromEntries(
    (request.headers.get("cookie") ?? "")
      .split(";")
      .map((part) => part.trim().split("="))
      .filter((parts) => parts.length === 2),
  );
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  if (!safeEqual(signature, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (decoded.role !== "admin" || decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: String(decoded.sub), role: "admin" as const };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string) {
  const secure = process.env.CONTEXT !== "dev" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.CONTEXT !== "dev" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

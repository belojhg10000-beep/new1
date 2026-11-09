import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { ALL_PERMISSIONS, type Permission } from "@/lib/constants";

const SESSION_COOKIE = "pb_session";
const GATE_COOKIE = "pb_gate";
const SESSION_TTL = 60 * 60 * 8; // 8h
const GATE_TTL = 60 * 10; // 10 min

export type AdminCtx = {
  id: number;
  username: string;
  displayName: string;
  role: "ADMIN" | "SUPERVISOR";
  permissions: Permission[];
};

function secretKey() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET (32+ chars) is not configured");
  return new TextEncoder().encode(s);
}

export function getIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim().slice(0, 64);
}

export function isSecure(req: Request) {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  return new URL(req.url).protocol === "https:";
}

export function baseUrl(req: Request) {
  const env = process.env.APP_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0] ?? new URL(req.url).protocol.replace(":", "");
  return `${proto}://${host}`;
}

/** CSRF defence in depth (cookies are also SameSite=Strict): mutating requests must come from our own origin. */
export function sameOrigin(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function json(data: unknown, status = 200, headers?: Record<string, string>) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}
export const fail = (message: string, status = 400, extra?: Record<string, unknown>) =>
  json({ ok: false, error: message, ...extra }, status);

export function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

// ---------- Gate (stage 1: secret code) ----------
export async function issueGate(req: Request) {
  const token = await new SignJWT({ gate: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${GATE_TTL}s`)
    .sign(secretKey());
  (await cookies()).set(GATE_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: isSecure(req),
    path: "/",
    maxAge: GATE_TTL,
  });
}

export async function hasGate() {
  const t = (await cookies()).get(GATE_COOKIE)?.value;
  if (!t) return false;
  try {
    const { payload } = await jwtVerify(t, secretKey(), { algorithms: ["HS256"] });
    return payload.gate === true;
  } catch {
    return false;
  }
}

export async function clearGate() {
  (await cookies()).delete(GATE_COOKIE);
}

// ---------- Session (stage 2: real authentication) ----------
export async function createSession(req: Request, admin: { id: number; sessionVersion: number }) {
  const token = await new SignJWT({ sv: admin.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(admin.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL}s`)
    .sign(secretKey());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: isSecure(req),
    path: "/",
    maxAge: SESSION_TTL,
  });
}

export async function destroySession() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
  c.delete(GATE_COOKIE);
}

/** Server-side session check: verifies the JWT AND reloads the admin from the DB (role/permissions are never trusted from the client). */
export async function getSession(): Promise<AdminCtx | null> {
  const t = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, secretKey(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    if (!Number.isInteger(id)) return null;
    const [a] = await db.select().from(admins).where(eq(admins.id, id));
    if (!a || !a.active || a.sessionVersion !== payload.sv) return null;
    const perms =
      a.role === "ADMIN"
        ? ALL_PERMISSIONS
        : (a.permissions.filter((p) => (ALL_PERMISSIONS as string[]).includes(p)) as Permission[]);
    return { id: a.id, username: a.username, displayName: a.displayName, role: a.role, permissions: perms };
  } catch {
    return null;
  }
}

export const can = (a: AdminCtx, p?: Permission) => !p || a.role === "ADMIN" || a.permissions.includes(p);

type Guard = { admin: AdminCtx; error?: undefined } | { admin?: undefined; error: Response };

/** Use at the top of every admin API handler. */
export async function guard(req: Request, perm?: Permission | "ADMIN_ONLY"): Promise<Guard> {
  if (!sameOrigin(req)) return { error: fail("طلب غير مسموح (CSRF)", 403) };
  const admin = await getSession();
  if (!admin) return { error: fail("غير مصرح. يرجى تسجيل الدخول.", 401) };
  if (perm === "ADMIN_ONLY") {
    if (admin.role !== "ADMIN") return { error: fail("هذه العملية للمسؤول فقط.", 403) };
  } else if (!can(admin, perm)) {
    return { error: fail("ليست لديك صلاحية لهذه العملية.", 403) };
  }
  return { admin };
}

/** Creates the first ADMIN from server env vars if no admin exists yet. */
export async function ensureSeedAdmin() {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(admins);
  if (n > 0) return;
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return;
  await db
    .insert(admins)
    .values({
      username,
      displayName: "المسؤول الرئيسي",
      passwordHash: await hashPassword(password),
      role: "ADMIN",
      permissions: ALL_PERMISSIONS,
    })
    .onConflictDoNothing();
}

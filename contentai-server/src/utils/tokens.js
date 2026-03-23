import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import db from "../config/db.js";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const IS_PROD = process.env.NODE_ENV === "production";

export function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, plan: user.plan, isAdmin: user.isAdmin || false },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

export async function generateRefreshToken(userId) {
  await db.read();
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS).toISOString();
  db.data.refreshTokens.push({ token, userId, expiresAt, createdAt: new Date().toISOString() });
  await db.write();
  return token;
}

export async function validateRefreshToken(token) {
  await db.read();
  const record = db.data.refreshTokens.find((r) => r.token === token);
  if (!record) return null;
  if (new Date(record.expiresAt) < new Date()) {
    db.data.refreshTokens = db.data.refreshTokens.filter((r) => r.token !== token);
    await db.write();
    return null;
  }
  return record;
}

export async function revokeRefreshToken(token) {
  await db.read();
  db.data.refreshTokens = db.data.refreshTokens.filter((r) => r.token !== token);
  await db.write();
}

export async function revokeAllUserTokens(userId) {
  await db.read();
  db.data.refreshTokens = db.data.refreshTokens.filter((r) => r.userId !== userId);
  await db.write();
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

// ── Cookie options ────────────────────────────────────────────
// Cross-domain (Vercel ↔ Railway) requires SameSite=None; Secure
export const ACCESS_COOKIE_OPTS = {
  httpOnly: true,
  secure: true, // Always true — required for SameSite=None
  sameSite: IS_PROD ? "none" : "lax", // "none" allows cross-origin cookies
  maxAge: 15 * 60 * 1000,
  path: "/",
};

export const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: IS_PROD ? "none" : "lax",
  maxAge: REFRESH_TOKEN_EXPIRY_MS,
  path: "/",  // Changed from /auth/refresh to / so it sends on all requests
};

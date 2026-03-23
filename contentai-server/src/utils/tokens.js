import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { RefreshToken } from "../models/mongo.js";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const IS_PROD = process.env.NODE_ENV === "production";

export function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id || user._id?.toString(),
      email: user.email,
      name: user.name,
      plan: user.plan,
      isAdmin: user.isAdmin || false,
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

export async function generateRefreshToken(userId) {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
  await RefreshToken.create({ token, userId: userId.toString(), expiresAt });
  return token;
}

export async function validateRefreshToken(token) {
  const record = await RefreshToken.findOne({ token }).lean();
  if (!record) return null;
  if (new Date(record.expiresAt) < new Date()) {
    await RefreshToken.deleteOne({ token });
    return null;
  }
  return record;
}

export async function revokeRefreshToken(token) {
  await RefreshToken.deleteOne({ token });
}

export async function revokeAllUserTokens(userId) {
  await RefreshToken.deleteMany({ userId: userId.toString() });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export const ACCESS_COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: IS_PROD ? "none" : "lax",
  maxAge: 15 * 60 * 1000,
  path: "/",
};

export const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: IS_PROD ? "none" : "lax",
  maxAge: REFRESH_TOKEN_EXPIRY_MS,
  path: "/",
};

import { Router } from "express";
import passport from "passport";
import rateLimit from "express-rate-limit";
import { UserModel } from "../models/user.js";
import {
  generateAccessToken,
  generateRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  ACCESS_COOKIE_OPTS,
  REFRESH_COOKIE_OPTS,
} from "../utils/tokens.js";
import { validateRegister, validateLogin } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
 
const router = Router();
 
// ── Rate limiting ────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});
 
// ── Helper: set both cookies and respond ─────────────────────
async function issueTokens(res, user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id);
 
  res.cookie("access_token", accessToken, ACCESS_COOKIE_OPTS);
  res.cookie("refresh_token", refreshToken, REFRESH_COOKIE_OPTS);
 
  return { accessToken, refreshToken };
}
 
// ── POST /auth/register ───────────────────────────────────────
router.post("/register", authLimiter, validateRegister, async (req, res) => {
  try {
    const { name, email, password } = req.body;
 
    // Check if email already exists before attempting create
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      // Google-only account — no password set
      if (existing.googleId && !existing.password) {
        return res.status(409).json({
          error: "This email is linked to a Google account. Please use \"Continue with Google\" to sign in.",
          code: "GOOGLE_ACCOUNT",
        });
      }
      // Regular account already exists
      return res.status(409).json({
        error: "An account with this email already exists. Did you mean to sign in?",
        code: "EMAIL_EXISTS",
      });
    }
 
    const user = await UserModel.create({ name, email, password });
    await issueTokens(res, user);
    res.status(201).json({ user });
  } catch (err) {
    console.error("[register]", err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});
 
// ── POST /auth/login ──────────────────────────────────────────
router.post("/login", authLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
 
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
 
    // Google-only account — no password set
    if (user.googleId && !user.password) {
      return res.status(401).json({
        error: "This account uses Google sign-in. Please use \"Continue with Google\" to sign in.",
        code: "GOOGLE_ACCOUNT",
      });
    }
 
    const valid = await UserModel.verifyPassword(user, password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
 
    const safeUser = UserModel.sanitize(user);
    await issueTokens(res, safeUser);
    res.json({ user: safeUser });
  } catch (err) {
    console.error("[login]", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});
 
// ── POST /auth/logout ─────────────────────────────────────────
router.post("/logout", requireAuth, async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) await revokeRefreshToken(refreshToken);
 
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/auth/refresh" });
    res.json({ message: "Logged out successfully." });
  } catch (err) {
    console.error("[logout]", err);
    res.status(500).json({ error: "Logout failed." });
  }
});
 
// ── POST /auth/logout-all ─────────────────────────────────────
router.post("/logout-all", requireAuth, async (req, res) => {
  try {
    await revokeAllUserTokens(req.user.sub);
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/auth/refresh" });
    res.json({ message: "Logged out from all devices." });
  } catch (err) {
    console.error("[logout-all]", err);
    res.status(500).json({ error: "Failed to log out all devices." });
  }
});
 
// ── POST /auth/refresh ────────────────────────────────────────
router.post("/refresh", async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ error: "No refresh token." });
 
    const record = await validateRefreshToken(token);
    if (!record) return res.status(401).json({ error: "Refresh token invalid or expired. Please log in again." });
 
    const user = await UserModel.findById(record.userId);
    if (!user) return res.status(401).json({ error: "User not found." });
 
    // Rotate refresh token (one-time use)
    await revokeRefreshToken(token);
    const safeUser = UserModel.sanitize(user);
    await issueTokens(res, safeUser);
 
    res.json({ user: safeUser });
  } catch (err) {
    console.error("[refresh]", err);
    res.status(500).json({ error: "Token refresh failed." });
  }
});
 
// ── GET /auth/me ──────────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.sub);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user: UserModel.sanitize(user) });
  } catch (err) {
    console.error("[me]", err);
    res.status(500).json({ error: "Failed to fetch user." });
  }
});
 
// ── GET /auth/google ──────────────────────────────────────────
const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
 
router.get("/google", (req, res, next) => {
  if (!googleConfigured) {
    return res.status(503).json({ error: "Google OAuth is not configured on this server." });
  }
  passport.authenticate("google", { scope: ["profile", "email"], session: false })(req, res, next);
});
 
// ── GET /auth/google/callback ─────────────────────────────────
router.get("/google/callback", (req, res, next) => {
  if (!googleConfigured) {
    return res.redirect(`${process.env.CLIENT_URL}/auth?error=google_not_configured`);
  }
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/auth?error=google_failed`,
  })(req, res, async (err) => {
    if (err) return next(err);
    try {
      await issueTokens(res, req.user);
      res.redirect(`${process.env.CLIENT_URL}?auth=success`);
    } catch (e) {
      console.error("[google/callback]", e);
      res.redirect(`${process.env.CLIENT_URL}/auth?error=server_error`);
    }
  });
});
 
export default router;
 

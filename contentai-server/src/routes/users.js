import { Router } from "express";
import bcrypt from "bcryptjs";
import { requireAuth } from "../middleware/auth.js";
import { UserModel } from "../models/user.js";
import { User } from "../models/mongo.js";
import { revokeAllUserTokens } from "../utils/tokens.js";

const router = Router();
const IS_PROD = process.env.NODE_ENV === "production";

const clearCookieOpts = {
  httpOnly: true,
  secure: true,
  sameSite: IS_PROD ? "none" : "lax",
  path: "/",
};

// ── GET /users/profile ────────────────────────────────────────
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.sub);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user: UserModel.sanitize(user) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile." });
  }
});

// ── PATCH /users/profile ──────────────────────────────────────
router.patch("/profile", requireAuth, async (req, res) => {
  try {
    const { name, email, avatar } = req.body;
    const user = await UserModel.updateProfile(req.user.sub, { name, email, avatar });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile." });
  }
});

// ── GET /users/usage ──────────────────────────────────────────
router.get("/usage", requireAuth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.sub);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({
      generationsUsed: user.generationsUsed || 0,
      generationsLimit: user.generationsLimit || 100,
      plan: user.plan || "free",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch usage." });
  }
});

// ── POST /users/change-password ───────────────────────────────
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(422).json({ error: "Both passwords are required." });
    if (newPassword.length < 8)
      return res.status(422).json({ error: "New password must be at least 8 characters." });

    const user = await UserModel.findById(req.user.sub);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (!user.password)
      return res.status(400).json({ error: "Password change not available for Google accounts." });

    const valid = await UserModel.verifyPassword(user, currentPassword);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect." });

    await UserModel.changePassword(req.user.sub, newPassword);
    await revokeAllUserTokens(req.user.sub);
    res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("[change-password]", err);
    res.status(500).json({ error: "Failed to change password." });
  }
});

// ── DELETE /users/delete-account ─────────────────────────────
router.delete("/delete-account", requireAuth, async (req, res) => {
  try {
    await UserModel.adminDelete(req.user.sub);
    res.clearCookie("access_token", clearCookieOpts);
    res.clearCookie("refresh_token", clearCookieOpts);
    res.json({ message: "Account deleted successfully." });
  } catch (err) {
    console.error("[delete-account]", err);
    res.status(500).json({ error: "Failed to delete account." });
  }
});

export default router;

import { Router } from "express";
import bcrypt from "bcryptjs";
import { requireAuth } from "../middleware/auth.js";
import { UserModel } from "../models/user.js";
import { revokeAllUserTokens } from "../utils/tokens.js";
import db from "../config/db.js";

const router = Router();

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
    await db.read();
    const user = db.data.users.find((u) => u.id === req.user.sub);
    if (!user) return res.status(404).json({ error: "User not found." });

    const allowed = ["name", "avatar", "email"];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) user[key] = req.body[key];
    });
    user.updatedAt = new Date().toISOString();

    await db.write();
    res.json({ user: UserModel.sanitize(user) });
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
    if (!currentPassword || !newPassword) {
      return res.status(422).json({ error: "Both current and new password are required." });
    }
    if (newPassword.length < 8) {
      return res.status(422).json({ error: "New password must be at least 8 characters." });
    }

    await db.read();
    const user = db.data.users.find((u) => u.id === req.user.sub);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (!user.password) {
      return res.status(400).json({ error: "Password change is not available for Google accounts." });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect." });

    user.password = await bcrypt.hash(newPassword, 12);
    user.updatedAt = new Date().toISOString();
    await db.write();

    // Revoke all sessions — force re-login on other devices
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
    await db.read();
    const userId = req.user.sub;

    // Remove user and all their refresh tokens
    db.data.users = db.data.users.filter((u) => u.id !== userId);
    db.data.refreshTokens = db.data.refreshTokens.filter((t) => t.userId !== userId);
    await db.write();

    // Clear cookies — must match exact options used when setting them
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    };
    res.clearCookie("access_token", { ...cookieOpts, path: "/" });
    res.clearCookie("refresh_token", { ...cookieOpts, path: "/auth/refresh" });

    res.json({ message: "Account deleted successfully." });
  } catch (err) {
    console.error("[delete-account]", err);
    res.status(500).json({ error: "Failed to delete account." });
  }
});

export default router;

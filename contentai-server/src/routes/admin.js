import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { UserModel } from "../models/user.js";
import { ProjectModel } from "../models/project.js";
import { getLogs, resolveError, clearResolvedLogs, getErrorStats } from "../utils/errorLogger.js";
import { revokeAllUserTokens } from "../utils/tokens.js";
import db from "../config/db.js";

const router = Router();

// All admin routes require admin auth
router.use(requireAdmin);

// ── GET /admin/stats ──────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    await db.read();
    const users = db.data.users || [];
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const newUsersToday = users.filter(u => new Date(u.createdAt) > last24h).length;
    const newUsersWeek = users.filter(u => new Date(u.createdAt) > last7d).length;
    const activeToday = users.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) > last24h).length;
    const totalGenerations = users.reduce((sum, u) => sum + (u.generationsUsed || 0), 0);
    const suspended = users.filter(u => u.suspended).length;
    const admins = users.filter(u => u.isAdmin).length;
    const googleUsers = users.filter(u => u.googleId).length;
    const planCounts = { free: 0, pro: 0, enterprise: 0 };
    users.forEach(u => { planCounts[u.plan] = (planCounts[u.plan] || 0) + 1; });

    const errorStats = getErrorStats();

    res.json({
      users: {
        total: users.length,
        newToday: newUsersToday,
        newThisWeek: newUsersWeek,
        activeToday,
        suspended,
        admins,
        googleUsers,
        plans: planCounts,
      },
      generations: {
        total: totalGenerations,
        avgPerUser: users.length ? Math.round(totalGenerations / users.length) : 0,
      },
      errors: errorStats,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats." });
  }
});

// ── GET /admin/users ──────────────────────────────────────────
router.get("/users", async (req, res) => {
  try {
    const { search, plan, suspended, page = 1, limit = 20 } = req.query;
    await db.read();
    let users = (db.data.users || []).map(u => UserModel.sanitize(u));

    if (search) {
      const q = search.toLowerCase();
      users = users.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    if (plan) users = users.filter(u => u.plan === plan);
    if (suspended !== undefined) users = users.filter(u => u.suspended === (suspended === "true"));

    users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = users.length;
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = users.slice(start, start + parseInt(limit));

    res.json({ users: paginated, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

// ── GET /admin/users/:id ──────────────────────────────────────
router.get("/users/:id", async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user: UserModel.sanitize(user) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user." });
  }
});

// ── PATCH /admin/users/:id ────────────────────────────────────
router.patch("/users/:id", async (req, res) => {
  try {
    const { plan, generationsLimit, suspended, isAdmin } = req.body;

    // Prevent self-demotion
    if (req.params.id === req.user.sub && isAdmin === false) {
      return res.status(400).json({ error: "You cannot remove your own admin access." });
    }

    const user = await UserModel.adminUpdate(req.params.id, { plan, generationsLimit, suspended, isAdmin });

    // If suspending, revoke all sessions
    if (suspended === true) await revokeAllUserTokens(req.params.id);

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to update user." });
  }
});

// ── POST /admin/users/:id/reset-usage ─────────────────────────
router.post("/users/:id/reset-usage", async (req, res) => {
  try {
    await UserModel.resetUsage(req.params.id);
    res.json({ message: "Usage reset successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset usage." });
  }
});

// ── DELETE /admin/users/:id ───────────────────────────────────
router.delete("/users/:id", async (req, res) => {
  try {
    if (req.params.id === req.user.sub) {
      return res.status(400).json({ error: "You cannot delete your own account from admin panel." });
    }
    await UserModel.adminDelete(req.params.id);
    res.json({ message: "User deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user." });
  }
});

// ── GET /admin/errors ─────────────────────────────────────────
router.get("/errors", (req, res) => {
  try {
    const { page = 1, limit = 50, resolved } = req.query;
    const result = getLogs({
      page: parseInt(page),
      limit: parseInt(limit),
      resolved: resolved === undefined ? undefined : resolved === "true",
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch error logs." });
  }
});

// ── PATCH /admin/errors/:id/resolve ───────────────────────────
router.patch("/errors/:id/resolve", (req, res) => {
  const success = resolveError(req.params.id);
  if (!success) return res.status(404).json({ error: "Error log not found." });
  res.json({ message: "Marked as resolved." });
});

// ── DELETE /admin/errors/resolved ─────────────────────────────
router.delete("/errors/resolved", (req, res) => {
  const remaining = clearResolvedLogs();
  res.json({ message: "Cleared resolved logs.", remaining });
});

// ── GET /admin/system ─────────────────────────────────────────
router.get("/system", async (req, res) => {
  try {
    // Check Ollama
    let ollamaStatus = "offline";
    let ollamaModel = process.env.OLLAMA_MODEL || "llama3.2";
    try {
      const r = await fetch(`${process.env.OLLAMA_URL || "http://localhost:11434"}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      });
      if (r.ok) ollamaStatus = "online";
    } catch (_) {}

    await db.read();
    const dbSize = JSON.stringify(db.data).length;

    res.json({
      server: {
        nodeVersion: process.version,
        uptime: Math.floor(process.uptime()),
        memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        env: process.env.NODE_ENV || "development",
      },
      ollama: { status: ollamaStatus, model: ollamaModel, url: process.env.OLLAMA_URL || "http://localhost:11434" },
      database: { sizeBytes: dbSize, users: db.data.users?.length || 0, tokens: db.data.refreshTokens?.length || 0 },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch system info." });
  }
});

export default router;

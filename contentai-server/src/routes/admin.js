import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { UserModel } from "../models/user.js";
import { ProjectModel } from "../models/project.js";
import { User, Project } from "../models/mongo.js";
import { getLogs, resolveError, clearResolvedLogs, getErrorStats } from "../utils/errorLogger.js";
import { revokeAllUserTokens } from "../utils/tokens.js";

const router = Router();
router.use(requireAdmin);

// ── GET /admin/stats ──────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers, newToday, newThisWeek, activeToday,
      suspended, admins, googleUsers,
      freePlan, proPlan, enterprisePlan,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gt: last24h } }),
      User.countDocuments({ createdAt: { $gt: last7d } }),
      User.countDocuments({ lastLoginAt: { $gt: last24h } }),
      User.countDocuments({ suspended: true }),
      User.countDocuments({ isAdmin: true }),
      User.countDocuments({ googleId: { $ne: null } }),
      User.countDocuments({ plan: "free" }),
      User.countDocuments({ plan: "pro" }),
      User.countDocuments({ plan: "enterprise" }),
    ]);

    const genResult = await User.aggregate([{ $group: { _id: null, total: { $sum: "$generationsUsed" } } }]);
    const totalGenerations = genResult[0]?.total || 0;
    const errorStats = await getErrorStats();

    res.json({
      users: {
        total: totalUsers, newToday, newThisWeek, activeToday,
        suspended, admins, googleUsers,
        plans: { free: freePlan, pro: proPlan, enterprise: enterprisePlan },
      },
      generations: {
        total: totalGenerations,
        avgPerUser: totalUsers ? Math.round(totalGenerations / totalUsers) : 0,
      },
      errors: errorStats,
    });
  } catch (err) {
    console.error("[admin/stats]", err);
    res.status(500).json({ error: "Failed to fetch stats." });
  }
});

// ── GET /admin/users ──────────────────────────────────────────
router.get("/users", async (req, res) => {
  try {
    const { search, plan, suspended, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
    if (plan) filter.plan = plan;
    if (suspended !== undefined) filter.suspended = suspended === "true";

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    res.json({ users: users.map(u => UserModel.sanitize(u)), total, page: parseInt(page), limit: parseInt(limit) });
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
    if (req.params.id === req.user.sub && isAdmin === false) {
      return res.status(400).json({ error: "You cannot remove your own admin access." });
    }
    const user = await UserModel.adminUpdate(req.params.id, { plan, generationsLimit, suspended, isAdmin });
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
    if (req.params.id === req.user.sub)
      return res.status(400).json({ error: "You cannot delete your own account from admin panel." });
    await UserModel.adminDelete(req.params.id);
    res.json({ message: "User deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user." });
  }
});

// ── GET /admin/errors ─────────────────────────────────────────
router.get("/errors", async (req, res) => {
  try {
    const { page = 1, limit = 50, resolved } = req.query;
    const result = await getLogs({
      page: parseInt(page), limit: parseInt(limit),
      resolved: resolved === undefined ? undefined : resolved === "true",
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch error logs." });
  }
});

// ── PATCH /admin/errors/:id/resolve ───────────────────────────
router.patch("/errors/:id/resolve", async (req, res) => {
  const success = await resolveError(req.params.id);
  if (!success) return res.status(404).json({ error: "Error log not found." });
  res.json({ message: "Marked as resolved." });
});

// ── DELETE /admin/errors/resolved ─────────────────────────────
router.delete("/errors/resolved", async (req, res) => {
  const count = await clearResolvedLogs();
  res.json({ message: "Cleared resolved logs.", count });
});

// ── GET /admin/system ─────────────────────────────────────────
router.get("/system", async (req, res) => {
  try {
    let ollamaStatus = "offline";
    try {
      const r = await fetch(`${process.env.OLLAMA_URL || "http://localhost:11434"}/api/tags`, { signal: AbortSignal.timeout(2000) });
      if (r.ok) ollamaStatus = "online";
    } catch (_) {}

    const dbStats = await User.db.db.stats();

    res.json({
      server: {
        nodeVersion: process.version,
        uptime: Math.floor(process.uptime()),
        memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        env: process.env.NODE_ENV || "development",
      },
      ollama: { status: ollamaStatus, model: process.env.OLLAMA_MODEL || "llama3.2" },
      database: {
        type: "MongoDB Atlas",
        sizeMB: Math.round((dbStats.dataSize || 0) / 1024 / 1024 * 100) / 100,
        users: await User.countDocuments(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch system info." });
  }
});

export default router;

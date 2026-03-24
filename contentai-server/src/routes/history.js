import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { History } from "../models/mongo.js";
import { UserModel } from "../models/user.js";

const router = Router();

// ── POST /history ─────────────────────────────────────────────
// Save a new generation to history
router.post("/", requireAuth, async (req, res) => {
  try {
    const { toolId, toolName, fields, output } = req.body;
    if (!toolId || !toolName || !output) {
      return res.status(422).json({ error: "toolId, toolName and output are required." });
    }

    const entry = await History.create({
      userId: req.user.sub,
      toolId,
      toolName,
      fields: fields || {},
      output,
    });

    res.status(201).json({ entry: formatEntry(entry) });
  } catch (err) {
    console.error("[history/save]", err);
    res.status(500).json({ error: "Failed to save history." });
  }
});

// ── GET /history ──────────────────────────────────────────────
// Get all history for current user
router.get("/", requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 100, toolId, search } = req.query;
    const filter = { userId: req.user.sub };
    if (toolId) filter.toolId = toolId;
    if (search) filter.$or = [
      { toolName: { $regex: search, $options: "i" } },
      { output: { $regex: search, $options: "i" } },
    ];

    const total = await History.countDocuments(filter);
    const entries = await History.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    res.json({ entries: entries.map(formatEntry), total });
  } catch (err) {
    console.error("[history/get]", err);
    res.status(500).json({ error: "Failed to fetch history." });
  }
});

// ── DELETE /history/:id ───────────────────────────────────────
// Delete a single history entry
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const result = await History.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.sub, // Ownership check
    });
    if (!result) return res.status(404).json({ error: "Entry not found." });
    res.json({ message: "Deleted." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete entry." });
  }
});

// ── DELETE /history ───────────────────────────────────────────
// Clear all history for current user
router.delete("/", requireAuth, async (req, res) => {
  try {
    const result = await History.deleteMany({ userId: req.user.sub });
    res.json({ message: "History cleared.", deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear history." });
  }
});

// ── GET /history/stats ────────────────────────────────────────
// Summary stats for current user
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;
    const total = await History.countDocuments({ userId });
    const now = new Date();
    const today = await History.countDocuments({
      userId,
      createdAt: { $gt: new Date(now.setHours(0, 0, 0, 0)) },
    });

    const byTool = await History.aggregate([
      { $match: { userId } },
      { $group: { _id: "$toolId", toolName: { $first: "$toolName" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({ total, today, byTool });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats." });
  }
});

// ── Helper ────────────────────────────────────────────────────
function formatEntry(entry) {
  return {
    id: entry._id?.toString() || entry.id,
    userId: entry.userId,
    toolId: entry.toolId,
    toolName: entry.toolName,
    fields: entry.fields,
    output: entry.output,
    createdAt: entry.createdAt,
  };
}

export default router;

import { ErrorLog } from "../models/mongo.js";

export async function logError({ route, method, status, message, stack, userId, ip, userAgent }) {
  try {
    await ErrorLog.create({ route, method, status, message, stack, userId, ip, userAgent });
  } catch (_) {}
}

export async function getLogs({ page = 1, limit = 50, resolved } = {}) {
  const filter = resolved !== undefined ? { resolved } : {};
  const total = await ErrorLog.countDocuments(filter);
  const logs = await ErrorLog.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  return { logs: logs.map(l => ({ ...l, id: l._id.toString() })), total, page, limit };
}

export async function resolveError(id) {
  const result = await ErrorLog.findByIdAndUpdate(id, { resolved: true });
  return !!result;
}

export async function clearResolvedLogs() {
  const result = await ErrorLog.deleteMany({ resolved: true });
  return result.deletedCount;
}

export async function getErrorStats() {
  const total = await ErrorLog.countDocuments();
  const unresolved = await ErrorLog.countDocuments({ resolved: false });
  const now = new Date();
  const last24h = await ErrorLog.countDocuments({ createdAt: { $gt: new Date(now - 24 * 60 * 60 * 1000) } });
  const last7d = await ErrorLog.countDocuments({ createdAt: { $gt: new Date(now - 7 * 24 * 60 * 60 * 1000) } });

  const topRoutes = await ErrorLog.aggregate([
    { $group: { _id: { method: "$method", route: "$route" }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    { $project: { route: { $concat: ["$_id.method", " ", "$_id.route"] }, count: 1, _id: 0 } },
  ]);

  return { total, unresolved, last24h, last7d, topRoutes };
}

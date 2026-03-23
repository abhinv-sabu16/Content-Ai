import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, "../../data");
const LOG_FILE = path.join(LOG_DIR, "errors.json");
const MAX_LOGS = 500;

fs.mkdirSync(LOG_DIR, { recursive: true });

function loadLogs() {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    return JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  } catch { return []; }
}

function saveLogs(logs) {
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  } catch (_) {}
}

export function logError({ route, method, status, message, stack, userId, ip, userAgent }) {
  const logs = loadLogs();
  logs.unshift({
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    route: route || "unknown",
    method: method || "unknown",
    status: status || 500,
    message: message || "Unknown error",
    stack: stack || null,
    userId: userId || null,
    ip: ip || null,
    userAgent: userAgent || null,
    resolved: false,
  });
  saveLogs(logs.slice(0, MAX_LOGS));
}

export function getLogs({ page = 1, limit = 50, resolved } = {}) {
  let logs = loadLogs();
  if (resolved !== undefined) {
    logs = logs.filter(l => l.resolved === resolved);
  }
  const total = logs.length;
  const start = (page - 1) * limit;
  return { logs: logs.slice(start, start + limit), total, page, limit };
}

export function resolveError(id) {
  const logs = loadLogs();
  const log = logs.find(l => l.id === id);
  if (log) { log.resolved = true; saveLogs(logs); return true; }
  return false;
}

export function clearResolvedLogs() {
  const logs = loadLogs().filter(l => !l.resolved);
  saveLogs(logs);
  return logs.length;
}

export function getErrorStats() {
  const logs = loadLogs();
  const now = new Date();
  const last24h = logs.filter(l => new Date(l.timestamp) > new Date(now - 24 * 60 * 60 * 1000));
  const last7d = logs.filter(l => new Date(l.timestamp) > new Date(now - 7 * 24 * 60 * 60 * 1000));

  const byRoute = {};
  logs.forEach(l => {
    const key = `${l.method} ${l.route}`;
    byRoute[key] = (byRoute[key] || 0) + 1;
  });

  const topRoutes = Object.entries(byRoute)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([route, count]) => ({ route, count }));

  return {
    total: logs.length,
    unresolved: logs.filter(l => !l.resolved).length,
    last24h: last24h.length,
    last7d: last7d.length,
    topRoutes,
  };
}

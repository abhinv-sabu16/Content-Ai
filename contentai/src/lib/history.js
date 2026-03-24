const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

// ── History API ───────────────────────────────────────────────

export async function getHistory({ page = 1, limit = 100, toolId, search } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (toolId) params.set("toolId", toolId);
  if (search) params.set("search", search);
  const data = await request(`/history?${params}`);
  return data.entries || [];
}

export async function saveToHistory({ toolId, toolName, fields, output }) {
  try {
    const data = await request("/history", {
      method: "POST",
      body: JSON.stringify({ toolId, toolName, fields, output }),
    });
    return data.entry;
  } catch (err) {
    console.error("[history] Failed to save:", err.message);
    return null;
  }
}

export async function deleteFromHistory(id) {
  await request(`/history/${id}`, { method: "DELETE" });
}

export async function clearHistory() {
  await request("/history", { method: "DELETE" });
}

export async function getHistoryStats() {
  const data = await request("/history/stats");
  return data;
}

// ── Usage (still local for now, synced with server generationsUsed) ──
const USAGE_KEY = "contentai_usage";

export function getUsage() {
  try {
    return JSON.parse(localStorage.getItem(USAGE_KEY) || '{"total":0,"today":0,"lastDate":""}');
  } catch { return { total: 0, today: 0, lastDate: "" }; }
}

export function incrementUsage() {
  const usage = getUsage();
  const today = new Date().toDateString();
  if (usage.lastDate !== today) { usage.today = 0; usage.lastDate = today; }
  usage.total += 1;
  usage.today += 1;
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
}

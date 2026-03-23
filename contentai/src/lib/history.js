const HISTORY_KEY = "contentai_history";
const USAGE_KEY = "contentai_usage";

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch { return []; }
}

export function saveToHistory(item) {
  const history = getHistory();
  const entry = { ...item, id: Date.now(), createdAt: new Date().toISOString() };
  history.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
  return entry;
}

export function deleteFromHistory(id) {
  const history = getHistory().filter(h => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function getUsage() {
  try {
    return JSON.parse(localStorage.getItem(USAGE_KEY) || '{"total":0,"today":0,"lastDate":""}');
  } catch { return { total: 0, today: 0, lastDate: "" }; }
}

export function incrementUsage() {
  const usage = getUsage();
  const today = new Date().toDateString();
  if (usage.lastDate !== today) {
    usage.today = 0;
    usage.lastDate = today;
  }
  usage.total += 1;
  usage.today += 1;
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
}

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: "include", // Send/receive HTTP-only cookies
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || "Request failed.");
    err.fields = data.fields || null;
    err.status = res.status;
    err.code = data.code || null;
    throw err;
  }

  return data;
}

// ── Auth API calls ────────────────────────────────────────────

export async function register({ name, email, password }) {
  const data = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  return data.user;
}

export async function login({ email, password }) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export async function logout() {
  await request("/auth/logout", { method: "POST" }).catch(() => {});
}

export async function getMe() {
  const data = await request("/auth/me");
  return data.user;
}

export async function refreshSession() {
  const data = await request("/auth/refresh", { method: "POST" });
  return data.user;
}

export async function getUsage() {
  const data = await request("/users/usage");
  return data;
}

// ── Google OAuth ──────────────────────────────────────────────
export function loginWithGoogle() {
  window.location.href = `${API}/auth/google`;
}

// ── Session helpers ───────────────────────────────────────────
// No localStorage for user data — session is managed via HTTP-only cookies.
// We keep a small in-memory cache of the user for the current tab session.
let _sessionUser = null;

export function getCachedUser() {
  return _sessionUser;
}

export function setCachedUser(user) {
  _sessionUser = user;
}

export function clearCachedUser() {
  _sessionUser = null;
}

// ── Profile API calls ─────────────────────────────────────────
export async function updateProfile({ name, email, avatar }) {
  const data = await request("/users/profile", {
    method: "PATCH",
    body: JSON.stringify({ name, email, avatar }),
  });
  return data.user;
}

export async function changePassword({ currentPassword, newPassword }) {
  await request("/users/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function deleteAccount() {
  await request("/users/delete-account", { method: "DELETE" });
  // Force clear local cache regardless
  clearCachedUser();
}

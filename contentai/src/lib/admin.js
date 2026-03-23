const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Request failed.");
    err.status = res.status;
    throw err;
  }
  return data;
}

export const getAdminStats   = ()          => request("/admin/stats");
export const getAdminSystem  = ()          => request("/admin/system");
export const getAdminUsers   = (params)    => request(`/admin/users?${new URLSearchParams(params)}`);
export const updateAdminUser = (id, data)  => request(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteAdminUser = (id)        => request(`/admin/users/${id}`, { method: "DELETE" });
export const resetUserUsage  = (id)        => request(`/admin/users/${id}/reset-usage`, { method: "POST" });
export const getAdminErrors  = (params)    => request(`/admin/errors?${new URLSearchParams(params)}`);
export const resolveError    = (id)        => request(`/admin/errors/${id}/resolve`, { method: "PATCH" });
export const clearResolved   = ()          => request("/admin/errors/resolved", { method: "DELETE" });

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

// ── Projects ──────────────────────────────────────────────────
export const getProjects = () => request("/projects");
export const createProject = (name, description) =>
  request("/projects", { method: "POST", body: JSON.stringify({ name, description }) });
export const updateProject = (id, data) =>
  request(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteProject = (id) =>
  request(`/projects/${id}`, { method: "DELETE" });

// ── Sources ───────────────────────────────────────────────────
export const getSources = (projectId) => request(`/projects/${projectId}/sources`);

export const uploadFile = async (projectId, file, onProgress) => {
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API}/projects/${projectId}/sources/file`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error || "Upload failed."));
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(formData);
  });
};

export const addUrlSource = (projectId, url) =>
  request(`/projects/${projectId}/sources/url`, { method: "POST", body: JSON.stringify({ url }) });

export const deleteSource = (projectId, sourceId) =>
  request(`/projects/${projectId}/sources/${sourceId}`, { method: "DELETE" });

export const searchProject = (projectId, query) =>
  request(`/projects/${projectId}/search`, { method: "POST", body: JSON.stringify({ query }) });

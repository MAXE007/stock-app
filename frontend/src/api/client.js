import { getToken, clearToken } from "../auth/tokenStorage";

const API_BASE = "http://127.0.0.1:8000";

async function parseError(res) {
  // intenta JSON {detail: ...}
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    return JSON.stringify(data);
  } catch {
    return await res.text().catch(() => "Request failed");
  }
}

export async function apiFetch(path, { auth = true, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const message = await parseError(res);

    // si el token quedó inválido/expiró
    if (res.status === 401) {
      clearToken();
    }

    const err = new Error(message || "Error");
    err.status = res.status;
    throw err;
  }

  // 204 No Content
  if (res.status === 204) return null;

  return res.json();
}

export { API_BASE };

export async function apiDownload(path) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Error descargando archivo");
  }

  return res.blob();
}
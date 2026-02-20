import { apiFetch, apiDownload, API_BASE  } from "./client";

// ---------- Auth ----------
export function register(email, password) {
  return apiFetch("/auth/register", {
    auth: false,
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email, password) {
  // OAuth2PasswordRequestForm usa form-data con username/password
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    let msg = "Credenciales inválidas";
    try {
      const data = await res.json();
      msg = data?.detail || msg;
    } catch {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res.json(); // {access_token, token_type}
}

export function getMe() {
  return apiFetch("/auth/me");
}

// ---------- Products ----------
export function getProducts() {
  return apiFetch("/products");
}

export function createProduct(payload) {
  return apiFetch("/products", { method: "POST", body: JSON.stringify(payload) });
}

export function updateProduct(id, payload) {
  return apiFetch(`/products/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteProduct(id) {
  return apiFetch(`/products/${id}`, { method: "DELETE" });
}

// ---------- Sales ----------
export function createSale(payload) {
  return apiFetch("/sales", { method: "POST", body: JSON.stringify(payload) });
}

export function getSales() {
  return apiFetch("/sales");
}

export function getSalesSummary(from, to) {
  return apiFetch(`/reports/sales/summary?from=${from}&to=${to}`);
}

export function getSalesDaily(from, to) {
  return apiFetch(`/reports/sales/daily?from=${from}&to=${to}`);
}

export async function downloadSalesCsv(from, to) {
  return apiDownload(`/reports/sales/export.csv?from=${from}&to=${to}`);
}

export async function downloadSalesDailyCsv(from, to) {
  return apiDownload(`/reports/sales/daily/export.csv?from=${from}&to=${to}`);
}

// ---------- Stock movements ----------
export function adjustStock(productId, payload) {
  return apiFetch(`/products/${productId}/stock`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getStockMovements(productId) {
  return apiFetch(`/products/${productId}/stock-movements`);
}

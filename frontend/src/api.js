const API_BASE = "http://127.0.0.1:8000";

export async function getProducts() {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error("Error listando productos");
  return res.json();
}

export async function createProduct(payload) {
  const res = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Error creando producto");
  }
  return res.json();
}

export async function updateProduct(id, payload) {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Error actualizando producto");
  }

  return res.json();
}

export async function createSale(payload) {
  const res = await fetch(`${API_BASE}/sales`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Error creando venta");
  }
  return res.json();
}

export async function getSales() {
  const res = await fetch(`${API_BASE}/sales`);
  if (!res.ok) throw new Error("Error listando ventas");
  return res.json();
}

export async function getSalesSummary(from, to) {
  const res = await fetch(`${API_BASE}/reports/sales/summary?from=${from}&to=${to}`);
  if (!res.ok) throw new Error("Error obteniendo resumen");
  return res.json();
}

export function getSalesCsvUrl(from, to) {
  return `${API_BASE}/reports/sales/export.csv?from=${from}&to=${to}`;
}

export async function getSalesDaily(from, to) {
  const res = await fetch(`${API_BASE}/reports/sales/daily?from=${from}&to=${to}`);
  if (!res.ok) throw new Error("Error obteniendo reporte diario");
  return res.json();
}

export function getSalesDailyCsvUrl(from, to) {
  return `${API_BASE}/reports/sales/daily/export.csv?from=${from}&to=${to}`;
}
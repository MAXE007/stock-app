import { useEffect, useMemo, useState } from "react";
import { getProducts, createProduct, createSale, getSales, getSalesSummary, getSalesCsvUrl, getSalesDaily, getSalesDailyCsvUrl } from "./api";
import DashboardLayout from "./components/DashboardLayout";
import Card from "./ui/Card";
import Button from "./ui/Button";
import KPI from "./ui/KPI";

export default function App() {
  // ----------------- Productos -----------------
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    price: 0,
    cost: 0,
    stock: 0,
    stock_min: 0,
  });

  // ----------------- Ventas -----------------
  const [cart, setCart] = useState([]); // { product_id, name, unit_price, qty }
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(true);

  // ----------------- UI -----------------
  const [tab, setTab] = useState("sales"); // "sales" | "products"
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

    // ----------------- Reportes -----------------

  const today = new Date().toISOString().slice(0, 10);
  const [reportFrom, setReportFrom] = useState(today);
  const [reportTo, setReportTo] = useState(today);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [daily, setDaily] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);

  async function loadSummary() {
    setErr("");
    setSummaryLoading(true);
    try {
      const data = await getSalesSummary(reportFrom, reportTo);
      setSummary(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadDaily() {
    setErr("");
    setDailyLoading(true);
    try {
      const data = await getSalesDaily(reportFrom, reportTo);
      setDaily(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setDailyLoading(false);
    }
  }

  function toast(message) {
    setMsg(message);
    setTimeout(() => setMsg(""), 2500);
  }

  async function refreshProducts() {
    setErr("");
    setProductsLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setProductsLoading(false);
    }
  }

  async function refreshSales() {
    setErr("");
    setSalesLoading(true);
    try {
      const data = await getSales();
      setSales(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSalesLoading(false);
    }
  }

  useEffect(() => {
    refreshProducts();
    refreshSales();
  }, []);

  // ----------------- Helpers -----------------
  const productsById = useMemo(() => {
    const m = new Map();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.qty * it.unit_price, 0);
  }, [cart]);

  function addToCart(productId) {
    const p = productsById.get(Number(productId));
    if (!p) return;

    setCart((prev) => {
      const existing = prev.find((x) => x.product_id === p.id);
      if (existing) {
        // sumar 1, pero sin pasar el stock disponible
        const nextQty = Math.min(existing.qty + 1, p.stock);
        return prev.map((x) =>
          x.product_id === p.id ? { ...x, qty: nextQty } : x
        );
      }
      return [...prev, { product_id: p.id, name: p.name, unit_price: Number(p.price), qty: p.stock > 0 ? 1 : 0 }];
    });
  }

  function updateQty(productId, qty) {
    const p = productsById.get(Number(productId));
    const max = p ? p.stock : 0;
    const q = Math.max(0, Math.min(Number(qty || 0), max));

    setCart((prev) =>
      prev.map((it) =>
        it.product_id === productId ? { ...it, qty: q } : it
      )
    );
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((it) => it.product_id !== productId));
  }

  async function submitProduct(e) {
    e.preventDefault();
    setErr("");

    if (!productForm.name.trim()) {
      setErr("El nombre es obligatorio");
      return;
    }

    const payload = {
      name: productForm.name.trim(),
      sku: productForm.sku.trim() || null,
      price: Number(productForm.price) || 0,
      cost: Number(productForm.cost) || 0,
      stock: Number(productForm.stock) || 0,
      stock_min: Number(productForm.stock_min) || 0,
    };

    try {
      await createProduct(payload);
      setProductForm({ name: "", sku: "", price: 0, cost: 0, stock: 0, stock_min: 0 });
      await refreshProducts();
      toast("Producto creado ✅");
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function confirmSale() {
    setErr("");

    const items = cart
      .filter((it) => it.qty > 0)
      .map((it) => ({
        product_id: it.product_id,
        qty: Number(it.qty),
        unit_price: Number(it.unit_price),
      }));

    if (items.length === 0) {
      setErr("El carrito está vacío");
      return;
    }

    try {
      await createSale({ payment_method: paymentMethod, items });
      setCart([]);
      toast("Venta registrada ✅");
      await refreshProducts();
      await refreshSales();
    } catch (e) {
      setErr(e.message);
    }
  }

  // ----------------- UI -----------------
  return (
    <DashboardLayout tab={tab} setTab={setTab}>

      {msg && (
        <div className="mt-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-2 font-medium">
          {msg}
        </div>
      )}
      {err && <p style={{ color: "crimson", marginTop: 12 }}>{err}</p>}

      {tab === "sales" && (
        <div className="mt-4 space-y-6">

          {/* 🔹 KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI
              title="Total ventas"
              value={`$${sales.reduce((acc, s) => acc + Number(s.total || 0), 0).toFixed(2)}`}
              hint="Suma del historial"
            />
            <KPI
              title="Cantidad ventas"
              value={sales.length}
              hint="Total de tickets"
            />
            <KPI
              title="Productos"
              value={products.length}
              hint="En catálogo"
            />
            <KPI
              title="Stock bajo"
              value={products.filter((p) => p.stock < p.stock_min).length}
              hint="Debajo del mínimo"
            />
          </div>
        
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* izquierda: catálogo + carrito */}
            <Card title="Caja (Carrito)" className="lg:col-span-2">

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <label>Medio de pago:</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ padding: 8 }}>
                  <option value="CASH">Efectivo</option>
                  <option value="TRANSFER">Transferencia</option>
                  <option value="MERCADO_PAGO">Mercado Pago</option>
                  <option value="DEBIT_CARD">Tarjeta débito</option>
                  <option value="CREDIT_CARD">Tarjeta crédito</option>
                  <option value="UNSPECIFIED">Sin especificar</option>
                </select>
              </div>

              <div style={{ marginTop: 14 }}>
                <h3 style={{ margin: "10px 0" }}>Agregar productos</h3>

                {productsLoading ? (
                  <p>Cargando productos...</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {products.map((p) => {
                      const low = p.stock < p.stock_min;
                      const disabled = p.stock <= 0;
                      return (
                        <button
                          key={p.id}
                          onClick={() => addToCart(p.id)}
                          disabled={disabled}
                          className={`
                            text-left rounded-xl border px-4 py-3 transition
                            ${disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white/5"}
                            ${low ? "border-pink-500/50" : "border-white/10"}
                            bg-white/[0.03]
                          `}
                        >
                          <div className="font-semibold text-white">
                            {p.name}
                          </div>
                          <div className="text-xs text-white/60">
                            ${p.price} — Stock: {p.stock} {low ? "⚠️" : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 18 }}>
                <h3 style={{ margin: "10px 0" }}>Carrito</h3>

                {cart.length === 0 ? (
                  <p style={{ opacity: 0.8 }}>No hay items aún.</p>
                ) : (
                  <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
                        <th>Producto</th>
                        <th>Precio</th>
                        <th>Cant</th>
                        <th>Subt</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((it) => (
                        <tr key={it.product_id} style={{ borderBottom: "1px solid #222" }}>
                          <td>{it.name}</td>
                          <td>${it.unit_price}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              value={it.qty}
                              onChange={(e) => updateQty(it.product_id, e.target.value)}
                              style={{ width: 80, padding: 6 }}
                            />
                          </td>
                          <td>${(it.qty * it.unit_price).toFixed(2)}</td>
                          <td>
                            <Button onClick={() => removeFromCart(it.product_id)}>
                              Quitar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>Total: ${cartTotal.toFixed(2)}</div>
                  <Button onClick={confirmSale} variant="primary">
                    Confirmar venta
                  </Button>
                </div>
              </div>
            </Card>

            {/* derecha: historial */}
            <Card title="Historial de ventas">

              {salesLoading ? (
                <p>Cargando ventas...</p>
              ) : sales.length === 0 ? (
                <p style={{ opacity: 0.8 }}>Todavía no hay ventas.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {sales.map((s) => (
                    <div key={s.id} style={{ border: "1px solid #222", borderRadius: 10, padding: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <div><b>Venta #{s.id}</b></div>
                        <div><b>${Number(s.total).toFixed(2)}</b></div>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                        Pago: {s.payment_method}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 13 }}>
                        {s.items?.map((it, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>• Prod {it.product_id} x{it.qty}</span>
                            <span>${Number(it.unit_price).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === "products" && (
        <div className="mt-4">
          <Card title="Productos">
            <form
              onSubmit={submitProduct}
              className="grid gap-3 grid-cols-1 md:grid-cols-6 items-end"
            >
              <div className="md:col-span-2">
                <label className="text-sm text-white/70">Nombre</label>
                <input
                  value={productForm.name}
                  onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  placeholder="Ej: Coca Cola 500ml"
                />
              </div>

              <div>
                <label className="text-sm text-white/70">SKU</label>
                <input
                  value={productForm.sku}
                  onChange={(e) => setProductForm((f) => ({ ...f, sku: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="text-sm text-white/70">Precio</label>
                <input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                />
              </div>

              <div>
                <label className="text-sm text-white/70">Costo</label>
                <input
                  type="number"
                  value={productForm.cost}
                  onChange={(e) => setProductForm((f) => ({ ...f, cost: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                />
              </div>

              <div>
                <label className="text-sm text-white/70">Stock</label>
                <input
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm((f) => ({ ...f, stock: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                />
              </div>

              <div>
                <label className="text-sm text-white/70">Min</label>
                <input
                  type="number"
                  value={productForm.stock_min}
                  onChange={(e) => setProductForm((f) => ({ ...f, stock_min: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                />
              </div>

              <div className="md:col-span-6 pt-1">
                <Button type="submit" variant="primary" className="w-full">
                  Agregar producto
                </Button>
              </div>
            </form>

            <div className="mt-6">
              <div className="mb-2 text-sm font-semibold text-white/85">Listado</div>

              {productsLoading ? (
                <div className="text-white/70">Cargando...</div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-white/70">
                      <tr className="text-left">
                        <th className="px-3 py-2">ID</th>
                        <th className="px-3 py-2">Nombre</th>
                        <th className="px-3 py-2">SKU</th>
                        <th className="px-3 py-2">Precio</th>
                        <th className="px-3 py-2">Costo</th>
                        <th className="px-3 py-2">Stock</th>
                        <th className="px-3 py-2">Min</th>
                        <th className="px-3 py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {products.map((p) => {
                        const low = p.stock < p.stock_min;
                        return (
                          <tr key={p.id} className="hover:bg-white/[0.03]">
                            <td className="px-3 py-2 text-white/80">{p.id}</td>
                            <td className="px-3 py-2 text-white/90 font-medium">{p.name}</td>
                            <td className="px-3 py-2 text-white/70">{p.sku || "-"}</td>
                            <td className="px-3 py-2 text-white/80">{p.price}</td>
                            <td className="px-3 py-2 text-white/80">{p.cost}</td>
                            <td className="px-3 py-2 text-white/80">{p.stock}</td>
                            <td className="px-3 py-2 text-white/80">{p.stock_min}</td>
                            <td className="px-3 py-2">
                              <span
                                className={
                                  "inline-flex items-center rounded-full px-2 py-1 text-xs border " +
                                  (low
                                    ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                                    : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200")
                                }
                              >
                                {low ? "⚠️ Bajo" : "✅ OK"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {tab === "reports" && (
        <div className="mt-4">
          <Card title="Reportes">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="text-sm text-white/70">Desde</label>
                  <input
                    type="date"
                    value={reportFrom}
                    onChange={(e) => setReportFrom(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/70">Hasta</label>
                  <input
                    type="date"
                    value={reportTo}
                    onChange={(e) => setReportTo(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  />
                </div>

                <Button onClick={loadSummary} variant="primary" disabled={summaryLoading}>
                  {summaryLoading ? "Cargando..." : "Ver resumen"}
                </Button>

                <a href={getSalesCsvUrl(reportFrom, reportTo)} className="inline-block">
                  <Button type="button">Exportar CSV</Button>
                </a>
              </div>
            </div>

            <div className="mt-5">
              {!summary ? (
                <div className="text-white/70">
                  Elegí un rango y tocá <span className="text-white/90 font-semibold">“Ver resumen”</span>.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Resumen rango */}
                  <Card
                    title="Resumen"
                    className="lg:col-span-1 bg-white/[0.02]"
                  >
                    <div className="text-sm text-white/80 space-y-2">
                      <div className="flex justify-between gap-3">
                        <span className="text-white/60">Rango</span>
                        <span className="text-white/90 font-medium">
                          {summary.from} → {summary.to}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-white/60">Ventas</span>
                        <span className="text-white/90 font-medium">{summary.count_sales}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-white/60">Total</span>
                        <span className="text-white font-semibold">
                          ${Number(summary.total).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Totales por medio */}
                  <Card title="Por medio de pago" className="lg:col-span-1 bg-white/[0.02]">
                    {Object.keys(summary.by_payment_method || {}).length === 0 ? (
                      <div className="text-white/70 text-sm">Sin datos en el rango.</div>
                    ) : (
                      <div className="space-y-2 text-sm">
                        {Object.entries(summary.by_payment_method).map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-3">
                            <span className="text-white/70">{k}</span>
                            <span className="text-white/90 font-medium">
                              ${Number(v).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Acciones + Diario */}
                  <Card title="Ventas por día" className="lg:col-span-1 bg-white/[0.02]">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Button onClick={loadDaily} disabled={dailyLoading}>
                        {dailyLoading ? "Cargando..." : "Ver diario"}
                      </Button>

                      <a href={getSalesDailyCsvUrl(reportFrom, reportTo)} className="inline-block">
                        <Button type="button">Exportar diario CSV</Button>
                      </a>
                    </div>

                    {!daily ? (
                      <div className="mt-3 text-white/70 text-sm">
                        Tocá <span className="text-white/90 font-semibold">“Ver diario”</span> para ver el detalle por fecha.
                      </div>
                    ) : daily.days.length === 0 ? (
                      <div className="mt-3 text-white/70 text-sm">Sin datos en el rango.</div>
                    ) : (
                      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                        <table className="w-full text-sm">
                          <thead className="bg-white/5 text-white/70">
                            <tr className="text-left">
                              <th className="px-3 py-2">Fecha</th>
                              <th className="px-3 py-2">Ventas</th>
                              <th className="px-3 py-2">Total</th>
                              <th className="px-3 py-2">Detalle</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {daily.days.map((d) => (
                              <tr key={d.date} className="hover:bg-white/[0.03]">
                                <td className="px-3 py-2 text-white/85">{d.date}</td>
                                <td className="px-3 py-2 text-white/75">{d.count_sales}</td>
                                <td className="px-3 py-2 text-white/90 font-medium">
                                  ${Number(d.total).toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-white/70">
                                  {Object.entries(d.by_payment_method).length === 0
                                    ? "-"
                                    : Object.entries(d.by_payment_method)
                                        .map(([k, v]) => `${k}: $${Number(v).toFixed(2)}`)
                                        .join(" · ")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}


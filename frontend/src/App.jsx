import { useEffect, useMemo, useState } from "react";
import { getProducts, createProduct, createSale, getSales, getSalesSummary, getSalesCsvUrl, getSalesDaily, getSalesDailyCsvUrl } from "./api";

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
    <div style={{ maxWidth: 1000, margin: "32px auto", padding: 16, fontFamily: "system-ui" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Stock App</h1>

        <nav style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setTab("sales")} style={tab === "sales" ? btnActive : btn}>
            Ventas
          </button>
          <button onClick={() => setTab("products")} style={tab === "products" ? btnActive : btn}>
            Productos
          </button>
          <button onClick={() => setTab("reports")} style={tab === "reports" ? btnActive : btn}>
            Reportes
          </button>
        </nav>
      </header>

      {msg && <div style={toastStyle}>{msg}</div>}
      {err && <p style={{ color: "crimson", marginTop: 12 }}>{err}</p>}

      {tab === "sales" && (
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          {/* izquierda: catálogo + carrito */}
          <section style={card}>
            <h2 style={{ marginTop: 0 }}>Caja (Carrito)</h2>

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
                        style={{
                          ...btn,
                          textAlign: "left",
                          opacity: disabled ? 0.5 : 1,
                          borderColor: low ? "#f0a" : "#333",
                        }}
                        title={disabled ? "Sin stock" : "Agregar al carrito"}
                      >
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>
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
                          <button onClick={() => removeFromCart(it.product_id)} style={btn}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Total: ${cartTotal.toFixed(2)}</div>
                <button onClick={confirmSale} style={btnActive}>
                  Confirmar venta
                </button>
              </div>
            </div>
          </section>

          {/* derecha: historial */}
          <section style={card}>
            <h2 style={{ marginTop: 0 }}>Historial de ventas</h2>

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
          </section>
        </div>
      )}

      {tab === "products" && (
        <div style={{ marginTop: 18 }}>
          <section style={card}>
            <h2 style={{ marginTop: 0 }}>Productos</h2>

            <form onSubmit={submitProduct} style={{ display: "grid", gap: 8, gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", alignItems: "end" }}>
              <div style={{ gridColumn: "span 2" }}>
                <label>Nombre</label>
                <input
                  value={productForm.name}
                  onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                  style={{ width: "100%", padding: 8 }}
                  placeholder="Ej: Coca Cola 500ml"
                />
              </div>

              <div>
                <label>SKU</label>
                <input
                  value={productForm.sku}
                  onChange={(e) => setProductForm((f) => ({ ...f, sku: e.target.value }))}
                  style={{ width: "100%", padding: 8 }}
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label>Precio</label>
                <input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>

              <div>
                <label>Costo</label>
                <input
                  type="number"
                  value={productForm.cost}
                  onChange={(e) => setProductForm((f) => ({ ...f, cost: e.target.value }))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>

              <div>
                <label>Stock</label>
                <input
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm((f) => ({ ...f, stock: e.target.value }))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>

              <div>
                <label>Min</label>
                <input
                  type="number"
                  value={productForm.stock_min}
                  onChange={(e) => setProductForm((f) => ({ ...f, stock_min: e.target.value }))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>

              <button type="submit" style={{ gridColumn: "span 6", padding: 10, marginTop: 6 }}>
                Agregar producto
              </button>
            </form>

            <div style={{ marginTop: 18 }}>
              <h3 style={{ margin: "10px 0" }}>Listado</h3>

              {productsLoading ? (
                <p>Cargando...</p>
              ) : (
                <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>SKU</th>
                      <th>Precio</th>
                      <th>Costo</th>
                      <th>Stock</th>
                      <th>Min</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const low = p.stock < p.stock_min;
                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid #222" }}>
                          <td>{p.id}</td>
                          <td>{p.name}</td>
                          <td>{p.sku || "-"}</td>
                          <td>{p.price}</td>
                          <td>{p.cost}</td>
                          <td>{p.stock}</td>
                          <td>{p.stock_min}</td>
                          <td>{low ? "⚠️ Bajo" : "✅ OK"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      )}
      {tab === "reports" && (
        <div style={{ marginTop: 18 }}>
          <section style={card}>
            <h2 style={{ marginTop: 0 }}>Reportes</h2>

            <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
              <div>
                <label>Desde</label>
                <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} style={{ padding: 8 }} />
              </div>

              <div>
                <label>Hasta</label>
                <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} style={{ padding: 8 }} />
              </div>

              <button onClick={loadSummary} style={btnActive} disabled={summaryLoading}>
                {summaryLoading ? "Cargando..." : "Ver resumen"}
              </button>

              <a
                href={getSalesCsvUrl(reportFrom, reportTo)}
                style={{ ...btn, textDecoration: "none", display: "inline-block" }}
              >
                Exportar CSV
              </a>
            </div>

            <div style={{ marginTop: 16 }}>
              {!summary ? (
                <p style={{ opacity: 0.8 }}>Elegí un rango y tocá “Ver resumen”.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ border: "1px solid #222", borderRadius: 10, padding: 10 }}>
                    <div><b>Rango:</b> {summary.from} → {summary.to}</div>
                    <div><b>Ventas:</b> {summary.count_sales}</div>
                    <div><b>Total:</b> ${Number(summary.total).toFixed(2)}</div>
                  </div>

                  <div style={{ border: "1px solid #222", borderRadius: 10, padding: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Totales por medio de pago</div>
                    {Object.keys(summary.by_payment_method || {}).length === 0 ? (
                      <div style={{ opacity: 0.8 }}>Sin datos en el rango.</div>
                    ) : (
                      Object.entries(summary.by_payment_method).map(([k, v]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>{k}</span>
                          <span>${Number(v).toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{ marginTop: 16, borderTop: "1px solid #222", paddingTop: 14 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0 }}>Ventas por día</h3>

                      <button onClick={loadDaily} style={btn} disabled={dailyLoading}>
                        {dailyLoading ? "Cargando..." : "Ver diario"}
                      </button>

                      <a
                        href={getSalesDailyCsvUrl(reportFrom, reportTo)}
                        style={{ ...btn, textDecoration: "none", display: "inline-block" }}
                      >
                        Exportar diario CSV
                      </a>
                    </div>

                    {!daily ? (
                      <p style={{ opacity: 0.8, marginTop: 10 }}>
                        Tocá “Ver diario” para ver el detalle por fecha.
                      </p>
                    ) : daily.days.length === 0 ? (
                      <p style={{ opacity: 0.8, marginTop: 10 }}>Sin datos en el rango.</p>
                    ) : (
                      <div style={{ marginTop: 10 }}>
                        <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
                              <th>Fecha</th>
                              <th>Ventas</th>
                              <th>Total</th>
                              <th>Detalle</th>
                            </tr>
                          </thead>
                          <tbody>
                            {daily.days.map((d) => (
                              <tr key={d.date} style={{ borderBottom: "1px solid #222" }}>
                                <td>{d.date}</td>
                                <td>{d.count_sales}</td>
                                <td>${Number(d.total).toFixed(2)}</td>
                                <td style={{ fontSize: 13, opacity: 0.9 }}>
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
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

const card = {
  border: "1px solid #222",
  borderRadius: 14,
  padding: 14,
  background: "#111",
};

const btn = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #333",
  background: "#171717",
  color: "white",
  cursor: "pointer",
};

const btnActive = {
  ...btn,
  background: "white",
  color: "#111",
  border: "1px solid white",
};

const toastStyle = {
  marginTop: 12,
  padding: 10,
  borderRadius: 10,
  background: "#0c2",
  color: "#111",
  fontWeight: 600,
};

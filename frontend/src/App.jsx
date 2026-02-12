import { useEffect, useMemo, useState } from "react";
import { getProducts, createProduct, createSale, getSales, getSalesSummary, getSalesCsvUrl, getSalesDaily, getSalesDailyCsvUrl } from "./api";
import DashboardLayout from "./components/DashboardLayout";
import SalesPage from "./pages/SalesPage";
import ProductsPage from "./pages/ProductsPage";
import ReportsPage from "./pages/ReportsPage";

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
  // ----------------- Gráfico -----------------
  function GlassTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;

    const total = payload.find((p) => p.dataKey === "total")?.value ?? 0;
    const count = payload.find((p) => p.dataKey === "count")?.value ?? 0;

    return (
      <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md px-3 py-2 shadow-xl">
        <div className="text-xs text-white/60">{label}</div>
        <div className="mt-1 text-sm text-white">
          <span className="font-semibold">${Number(total).toFixed(2)}</span>
          <span className="text-white/60"> · </span>
          <span className="text-white/80">{Number(count)} ventas</span>
        </div>
      </div>
    );
  }

  // ----------------- UI -----------------
  return (
    <DashboardLayout tab={tab} setTab={setTab}>

      {msg && (
        <div className="mt-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-2 font-medium">
          {msg}
        </div>
      )}
      {err && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-red-200">
          {err}
        </div>
      )}

      {tab === "sales" && (
        <SalesPage
          products={products}
          productsLoading={productsLoading}
          sales={sales}
          salesLoading={salesLoading}
          cart={cart}
          paymentMethod={paymentMethod}
          cartTotal={cartTotal}
          setPaymentMethod={setPaymentMethod}
          addToCart={addToCart}
          updateQty={updateQty}
          removeFromCart={removeFromCart}
          confirmSale={confirmSale}
        />
      )}

      {tab === "products" && (
        <ProductsPage
          products={products}
          productsLoading={productsLoading}
          productForm={productForm}
          setProductForm={setProductForm}
          submitProduct={submitProduct}
        />
      )}

      {tab === "reports" && (
        <ReportsPage
          reportFrom={reportFrom}
          reportTo={reportTo}
          setReportFrom={setReportFrom}
          setReportTo={setReportTo}
          summary={summary}
          summaryLoading={summaryLoading}
          daily={daily}
          dailyLoading={dailyLoading}
          loadSummary={loadSummary}
          loadDaily={loadDaily}
          getSalesCsvUrl={getSalesCsvUrl}
          getSalesDailyCsvUrl={getSalesDailyCsvUrl}
        />
      )}
    </DashboardLayout>
  );
}


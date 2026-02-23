import { useMemo, useState, useRef, useEffect } from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import KPI from "../ui/KPI";

export default function SalesPage({
  // data
  products,
  productsLoading,
  sales,
  salesLoading,
  cart,
  paymentMethod,

  // computed
  cartTotal,

  // actions
  setPaymentMethod,
  addToCart,
  updateQty,
  removeFromCart,
  confirmSale,
}) {
  // ----------------- Filtros (Historial) -----------------
  const [filterPayment, setFilterPayment] = useState("ALL");
  const [filterId, setFilterId] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");

  const filteredSales = useMemo(() => {
    const idWanted = filterId.trim() ? Number(filterId) : null;
    const min = minTotal === "" ? null : Number(minTotal);
    const max = maxTotal === "" ? null : Number(maxTotal);

    return sales.filter((s) => {
      // ID exacto
      if (idWanted !== null && !Number.isNaN(idWanted)) {
        if (Number(s.id) !== idWanted) return false;
      }

      // Medio de pago
      if (filterPayment !== "ALL" && s.payment_method !== filterPayment) return false;

      // Total min/max
      const total = Number(s.total || 0);
      if (min !== null && !Number.isNaN(min) && total < min) return false;
      if (max !== null && !Number.isNaN(max) && total > max) return false;

      return true;
    });
  }, [sales, filterId, filterPayment, minTotal, maxTotal]);

  function clearFilters() {
    setFilterPayment("ALL");
    setFilterId("");
    setMinTotal("");
    setMaxTotal("");
  }

  // ----------------- Buscador rápido (Caja) -----------------
  const [quickSearch, setQuickSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleQuickAdd() {
    const term = quickSearch.trim().toLowerCase();
    if (!term) return;

    // 1️⃣ Buscar SKU exacto
    const skuMatch = products.find(
      (p) => p.sku?.toLowerCase() === term
    );

    if (skuMatch) {
      if (skuMatch.stock <= 0) {
        alert("Producto sin stock");
        setQuickSearch("");
        return;
      }

      addToCart(skuMatch.id);
      setQuickSearch("");
      setSuggestions([]);
      setActiveIndex(0);
      return;
    }

    // Buscar por nombre parcial
    const nameMatches = products.filter((p) =>
      p.name.toLowerCase().includes(term)
    );

    if (nameMatches.length === 0) {
      alert("Producto no encontrado");
      setQuickSearch("");
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    if (nameMatches.length === 1) {
      if (nameMatches[0].stock <= 0) {
        alert("Producto sin stock");
        setQuickSearch("");
        return;
      }

      addToCart(nameMatches[0].id);
      setQuickSearch("");
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    // Si hay varios → mostrar lista
    setSuggestions(nameMatches.slice(0, 5)); // máximo 5 sugerencias
    setActiveIndex(0);
  }

  // Modal confirmacion de venta, "ESC" = Salir , "ENTER" = Confirmar

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Ticket venta
  function printTicket() {
    const content = `
      <html>
        <head>
          <title>Ticket</title>
          <style>
            body { font-family: monospace; padding: 20px; }
            h2 { margin-bottom: 10px; }
            .line { display: flex; justify-content: space-between; }
            .total { font-weight: bold; margin-top: 10px; }
          </style>
        </head>
        <body>
          <h2>Ticket de Venta</h2>
          ${cart
            .map(
              (it) => `
              <div class="line">
                <span>${it.name} x${it.qty}</span>
                <span>$${(it.qty * Number(it.price ?? it.unit_price ?? 0)).toFixed(2)}</span>
              </div>
            `
            )
            .join("")}
          <div class="total">
            Total: $${cartTotal.toFixed(2)}
          </div>
          <div>Pago: ${paymentMethod}</div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "", "width=400,height=600");
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  }

  function handleConfirm() {
    printTicket();       // imprime usando el estado actual
    confirmSale();       // después limpia el carrito
    setShowConfirmModal(false);
  }

  useEffect(() => {
    function handleKey(e) {
      if (!showConfirmModal) return;

      if (e.key === "Escape") {
        setShowConfirmModal(false);
      }

      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirm();
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showConfirmModal, handleConfirm]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          title="Total ventas (historial)"
          value={`$${sales
            .reduce((acc, s) => acc + Number(s.total || 0), 0)
            .toFixed(2)}`}
          hint="Suma de todas las ventas cargadas"
        />
        <KPI title="Cantidad de ventas" value={sales.length} hint="Total de tickets" />
        <KPI title="Productos" value={products.length} hint="Ítems en catálogo" />
        <KPI
          title="Stock bajo"
          value={products.filter((p) => p.stock < p.stock_min).length}
          hint="Debajo del mínimo"
        />
      </div>

      {/* Layout actual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Carrito */}
        <Card title="Caja (Carrito)" className="lg:col-span-2">
          <div className="flex flex-wrap gap-3 items-center">
            <label className="text-sm text-white/70">Medio de pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none
                         focus:border-white/20 focus:ring-2 focus:ring-white/10"
            >
              <option className="bg-neutral-900 text-white" value="CASH">
                Efectivo
              </option>
              <option className="bg-neutral-900 text-white" value="TRANSFER">
                Transferencia
              </option>
              <option className="bg-neutral-900 text-white" value="MERCADO_PAGO">
                Mercado Pago
              </option>
              <option className="bg-neutral-900 text-white" value="DEBIT_CARD">
                Tarjeta débito
              </option>
              <option className="bg-neutral-900 text-white" value="CREDIT_CARD">
                Tarjeta crédito
              </option>
              <option className="bg-neutral-900 text-white" value="UNSPECIFIED">
                Sin especificar
              </option>
            </select>
          </div>

          <div className="mt-5">
            <div className="text-sm font-semibold text-white/85 mb-2">Agregar productos</div>
            <div className="mb-3 relative">
              <input
                ref={inputRef}
                value={quickSearch}
                onChange={(e) => {
                  setQuickSearch(e.target.value);
                  setSuggestions([]);
                  setActiveIndex(-1);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    if (suggestions.length > 0) {
                      setActiveIndex((prev) =>
                        prev < suggestions.length - 1 ? prev + 1 : 0
                      );
                    }
                  }

                  else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    if (suggestions.length > 0) {
                      setActiveIndex((prev) =>
                        prev > 0 ? prev - 1 : suggestions.length - 1
                      );
                    }
                  }

                  else if (e.key === "Enter") {
                    if (suggestions.length > 0 && activeIndex >= 0) {
                      const selected = suggestions[activeIndex];

                      if (selected.stock <= 0) {
                        alert("Producto sin stock");
                        return;
                      }

                      addToCart(selected.id);
                      setQuickSearch("");
                      setSuggestions([]);
                      setActiveIndex(-1);
                    } else {
                      handleQuickAdd();
                    }
                  }

                  else if (e.key === "Escape") {
                    setSuggestions([]);
                    setActiveIndex(-1);
                  }
                }}
                placeholder="Escanear SKU o escribir nombre y presionar Enter..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none
                          focus:border-white/20 focus:ring-2 focus:ring-white/10"
              />

              {/* Dropdown sugerencias */}
              {suggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-white/10 bg-neutral-900 shadow-xl">
                  {suggestions.map((p, index) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (p.stock <= 0) {
                          alert("Producto sin stock");
                          return;
                        }

                        addToCart(p.id);
                        setQuickSearch("");
                        setSuggestions([]);
                      }}
                      className={`
                        w-full text-left px-4 py-3 border-b border-white/5 last:border-none
                        ${activeIndex === index ? "bg-white/10" : "hover:bg-white/5"}
                      `}
                    >
                      <div className="text-white font-medium">{p.name}</div>
                      <div className="text-xs text-white/60">
                        SKU: {p.sku} — ${p.price} — Stock: {p.stock}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {productsLoading ? (
              <div className="text-white/70">Cargando productos...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                      title={disabled ? "Sin stock" : "Agregar al carrito"}
                    >
                      <div className="font-semibold text-white">{p.name}</div>
                      <div className="text-xs text-white/60">
                        ${p.price} — Stock: {p.stock} {low ? "⚠️" : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="text-sm font-semibold text-white/85 mb-2">Carrito</div>

            {cart.length === 0 ? (
              <div className="text-white/60">No hay items aún.</div>
            ) : (
              <div className="space-y-2">
                {cart.map((it) => (
                  <div
                    key={it.product_id}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-white font-medium truncate">{it.name}</div>
                      <div className="text-xs text-white/60">
                        ${(it.price ?? it.unit_price).toFixed?.(2) ?? (it.price ?? it.unit_price)} · Subtotal: ${(
                        it.qty * Number(it.price ?? it.unit_price ?? 0)).toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={it.qty}
                        onChange={(e) => updateQty(it.product_id, e.target.value)}
                        className="w-20 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
                      />

                      <Button onClick={() => removeFromCart(it.product_id)}>Quitar</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <div className="text-white font-semibold text-lg">Total: ${cartTotal.toFixed(2)}</div>

              <Button
                onClick={() => {
                  if (cart.length === 0) return;
                  setShowConfirmModal(true);
                }}
                variant="primary"
              >
                Confirmar venta
              </Button>
            </div>
          </div>
        </Card>

        {/* Historial */}
        <Card title="Historial de ventas">
          {/* Filtros */}
          <div className="mb-4 space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/60">Venta ID</label>
                  <input
                    value={filterId}
                    onChange={(e) => setFilterId(e.target.value)}
                    placeholder="Ej: 12"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60">Medio de pago</label>
                  <select
                    value={filterPayment}
                    onChange={(e) => setFilterPayment(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  >
                    <option className="bg-neutral-900 text-white" value="ALL">
                      Todos
                    </option>
                    <option className="bg-neutral-900 text-white" value="CASH">
                      Efectivo
                    </option>
                    <option className="bg-neutral-900 text-white" value="TRANSFER">
                      Transferencia
                    </option>
                    <option className="bg-neutral-900 text-white" value="MERCADO_PAGO">
                      Mercado Pago
                    </option>
                    <option className="bg-neutral-900 text-white" value="DEBIT_CARD">
                      Débito
                    </option>
                    <option className="bg-neutral-900 text-white" value="CREDIT_CARD">
                      Crédito
                    </option>
                    <option className="bg-neutral-900 text-white" value="UNSPECIFIED">
                      Sin especificar
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/60">Total mínimo</label>
                  <input
                    type="number"
                    value={minTotal}
                    onChange={(e) => setMinTotal(e.target.value)}
                    placeholder="Ej: 1000"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60">Total máximo</label>
                  <input
                    type="number"
                    value={maxTotal}
                    onChange={(e) => setMaxTotal(e.target.value)}
                    placeholder="Ej: 50000"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-white/60">
                Mostrando{" "}
                <span className="text-white/80 font-semibold">{filteredSales.length}</span> de{" "}
                <span className="text-white/80 font-semibold">{sales.length}</span>
              </div>
              <Button onClick={clearFilters}>Limpiar</Button>
            </div>
          </div>

          {/* Lista */}
          {salesLoading ? (
            <div className="text-white/70">Cargando ventas...</div>
          ) : filteredSales.length === 0 ? (
            <div className="text-white/60">No hay ventas con esos filtros.</div>
          ) : (
            <div className="space-y-3">
              {filteredSales.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-white font-semibold">Venta #{s.id}</div>
                    <div className="text-white font-semibold">${Number(s.total).toFixed(2)}</div>
                  </div>

                  <div className="mt-1 text-xs text-white/60">Pago: {s.payment_method}</div>

                  <div className="mt-2 text-sm text-white/80 space-y-1">
                    {s.items?.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          • Prod {it.product_id} x{it.qty}
                        </span>
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
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-white/10 p-6 shadow-2xl">
            
            <div className="text-xl font-semibold text-white mb-4">
              Confirmar venta
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {cart.map((it) => (
                <div key={it.product_id} className="flex justify-between text-sm text-white/80">
                  <span>
                    {it.name} x{it.qty}
                  </span>
                  <span>
                    ${(it.qty * Number(it.price ?? it.unit_price ?? 0)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-4 mb-4">
              <div className="text-sm text-white/60">Medio de pago</div>
              <div className="text-white font-semibold mb-2">{paymentMethod}</div>

              <div className="text-lg font-bold text-white">
                Total: ${cartTotal.toFixed(2)}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setShowConfirmModal(false)}
              >
                Cancelar
              </Button>

              <Button
                variant="primary"
                onClick={handleConfirm}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

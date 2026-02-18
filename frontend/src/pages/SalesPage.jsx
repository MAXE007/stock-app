import { useMemo, useState } from "react";
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

              <Button onClick={confirmSale} variant="primary">
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
    </div>
  );
}

import { useMemo, useState } from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { updateProduct } from "../api";

export default function ProductsPage({
  products,
  productsLoading,
  productForm,
  setProductForm,
  submitProduct,

  // nuevos
  refreshProducts,
  toast,
  setErr,
}) {
  // ----------------- Filtros/Listado -----------------
  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [sortBy, setSortBy] = useState("name_asc"); // name_asc | stock_asc | stock_desc | price_asc | price_desc

  // ----------------- Inline edit -----------------
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const filteredProducts = useMemo(() => {
    const query = q.trim().toLowerCase();

    let list = products;

    // Search por nombre o sku
    if (query) {
      list = list.filter((p) => {
        const name = String(p.name || "").toLowerCase();
        const sku = String(p.sku || "").toLowerCase();
        return name.includes(query) || sku.includes(query);
      });
    }

    // Solo stock bajo
    if (onlyLow) {
      list = list.filter((p) => Number(p.stock) < Number(p.stock_min));
    }

    // Sort
    const sorted = [...list].sort((a, b) => {
      const an = String(a.name || "");
      const bn = String(b.name || "");

      const aStock = Number(a.stock || 0);
      const bStock = Number(b.stock || 0);

      const aPrice = Number(a.price || 0);
      const bPrice = Number(b.price || 0);

      switch (sortBy) {
        case "stock_asc":
          return aStock - bStock;
        case "stock_desc":
          return bStock - aStock;
        case "price_asc":
          return aPrice - bPrice;
        case "price_desc":
          return bPrice - aPrice;
        case "name_asc":
        default:
          return an.localeCompare(bn);
      }
    });

    return sorted;
  }, [products, q, onlyLow, sortBy]);

  const lowCount = useMemo(() => {
    return products.filter((p) => Number(p.stock) < Number(p.stock_min)).length;
  }, [products]);

  function clearFilters() {
    setQ("");
    setOnlyLow(false);
    setSortBy("name_asc");
  }

  function startEdit(p) {
    setErr?.("");
    setEditId(p.id);
    setDraft({
      name: p.name ?? "",
      sku: p.sku ?? "",
      price: Number(p.price ?? 0),
      cost: Number(p.cost ?? 0),
      stock: Number(p.stock ?? 0),
      stock_min: Number(p.stock_min ?? 0),
    });
  }

  function cancelEdit() {
    setEditId(null);
    setDraft(null);
  }

  async function saveEdit(id) {
    if (!draft) return;

    setErr?.("");
    if (!String(draft.name || "").trim()) {
      setErr?.("El nombre es obligatorio");
      return;
    }

    const payload = {
      name: String(draft.name).trim(),
      sku: String(draft.sku || "").trim() || null,
      price: Number(draft.price) || 0,
      cost: Number(draft.cost) || 0,
      stock: Math.max(0, Number(draft.stock) || 0),
      stock_min: Math.max(0, Number(draft.stock_min) || 0),
    };

    try {
      setSaving(true);
      await updateProduct(id, payload);   // <-- GUARDA EN BACKEND
      await refreshProducts();           // <-- REFRESCA LISTA
      toast?.("Producto actualizado ✅");
      cancelEdit();
    } catch (e) {
      setErr?.(e.message || "Error actualizando producto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4">
      <Card title="Productos">
        {/* -------- Form alta -------- */}
        <form
          onSubmit={submitProduct}
          className="grid gap-3 grid-cols-1 md:grid-cols-6 items-end"
        >
          <div className="md:col-span-2">
            <label className="text-sm text-white/70">Nombre</label>
            <input
              value={productForm.name}
              onChange={(e) =>
                setProductForm((f) => ({ ...f, name: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
              placeholder="Ej: Coca Cola 500ml"
            />
          </div>

          <div>
            <label className="text-sm text-white/70">SKU</label>
            <input
              value={productForm.sku}
              onChange={(e) =>
                setProductForm((f) => ({ ...f, sku: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
              placeholder="Opcional"
            />
          </div>

          <div>
            <label className="text-sm text-white/70">Precio</label>
            <input
              type="number"
              value={productForm.price}
              onChange={(e) =>
                setProductForm((f) => ({ ...f, price: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
            />
          </div>

          <div>
            <label className="text-sm text-white/70">Costo</label>
            <input
              type="number"
              value={productForm.cost}
              onChange={(e) =>
                setProductForm((f) => ({ ...f, cost: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
            />
          </div>

          <div>
            <label className="text-sm text-white/70">Stock</label>
            <input
              type="number"
              value={productForm.stock}
              onChange={(e) =>
                setProductForm((f) => ({ ...f, stock: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
            />
          </div>

          <div>
            <label className="text-sm text-white/70">Min</label>
            <input
              type="number"
              value={productForm.stock_min}
              onChange={(e) =>
                setProductForm((f) => ({ ...f, stock_min: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
            />
          </div>

          <div className="md:col-span-6 pt-1">
            <Button type="submit" variant="primary" className="w-full">
              Agregar producto
            </Button>
          </div>
        </form>

        {/* -------- Listado + filtros -------- */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-white/85">Listado</div>

            <div className="text-xs text-white/60">
              Bajo stock:{" "}
              <span className="text-white/80 font-semibold">{lowCount}</span>
            </div>
          </div>

          {/* Filtros */}
          <div className="mb-4 grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1">
                <label className="text-xs text-white/60">Buscar</label>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nombre o SKU…"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                />
              </div>

              <div>
                <label className="text-xs text-white/60">Ordenar</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                >
                  <option className="bg-neutral-900 text-white" value="name_asc">Nombre (A-Z)</option>
                  <option className="bg-neutral-900 text-white" value="stock_asc">Stock (menor → mayor)</option>
                  <option className="bg-neutral-900 text-white" value="stock_desc">Stock (mayor → menor)</option>
                  <option className="bg-neutral-900 text-white" value="price_asc">Precio (menor → mayor)</option>
                  <option className="bg-neutral-900 text-white" value="price_desc">Precio (mayor → menor)</option>
                </select>
              </div>

              <div className="flex items-end justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-white/80 select-none">
                  <input
                    type="checkbox"
                    checked={onlyLow}
                    onChange={(e) => setOnlyLow(e.target.checked)}
                    className="h-4 w-4 accent-amber-400"
                  />
                  Solo stock bajo
                </label>

                <Button type="button" onClick={clearFilters}>
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="text-xs text-white/60">
              Mostrando{" "}
              <span className="text-white/80 font-semibold">{filteredProducts.length}</span>{" "}
              de{" "}
              <span className="text-white/80 font-semibold">{products.length}</span>
            </div>
          </div>

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
                    <th className="px-3 py-2 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {filteredProducts.map((p) => {
                    const low = Number(p.stock) < Number(p.stock_min);
                    const isEditing = editId === p.id;

                    return (
                      <tr
                        key={p.id}
                        className={
                          "hover:bg-white/[0.03] " + (low ? "bg-amber-400/[0.03]" : "")
                        }
                      >
                        <td className="px-3 py-2 text-white/80">{p.id}</td>

                        <td className="px-3 py-2 text-white/90 font-medium">
                          {isEditing ? (
                            <input
                              value={draft?.name ?? ""}
                              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                            />
                          ) : (
                            p.name
                          )}
                        </td>

                        <td className="px-3 py-2 text-white/70">
                          {isEditing ? (
                            <input
                              value={draft?.sku ?? ""}
                              onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))}
                              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                            />
                          ) : (
                            p.sku || "-"
                          )}
                        </td>

                        <td className="px-3 py-2 text-white/80">
                          {isEditing ? (
                            <input
                              type="number"
                              value={draft?.price ?? 0}
                              onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                            />
                          ) : (
                            p.price
                          )}
                        </td>

                        <td className="px-3 py-2 text-white/80">
                          {isEditing ? (
                            <input
                              type="number"
                              value={draft?.cost ?? 0}
                              onChange={(e) => setDraft((d) => ({ ...d, cost: e.target.value }))}
                              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                            />
                          ) : (
                            p.cost
                          )}
                        </td>

                        <td className="px-3 py-2 text-white/80">
                          {isEditing ? (
                            <input
                              type="number"
                              value={draft?.stock ?? 0}
                              onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))}
                              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                            />
                          ) : (
                            p.stock
                          )}
                        </td>

                        <td className="px-3 py-2 text-white/80">
                          {isEditing ? (
                            <input
                              type="number"
                              value={draft?.stock_min ?? 0}
                              onChange={(e) => setDraft((d) => ({ ...d, stock_min: e.target.value }))}
                              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                            />
                          ) : (
                            p.stock_min
                          )}
                        </td>

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

                        <td className="px-3 py-2 text-right">
                          {!isEditing ? (
                            <Button type="button" onClick={() => startEdit(p)}>
                              Editar
                            </Button>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button type="button" onClick={cancelEdit} disabled={saving}>
                                Cancelar
                              </Button>
                              <Button
                                type="button"
                                variant="primary"
                                onClick={() => saveEdit(p.id)}
                                disabled={saving}
                              >
                                {saving ? "Guardando..." : "Guardar"}
                              </Button>
                            </div>
                          )}
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
  );
}

import Card from "../ui/Card";
import Button from "../ui/Button";

export default function ProductsPage({
  products,
  productsLoading,
  productForm,
  setProductForm,
  submitProduct,
}) {
  return (
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
  );
}

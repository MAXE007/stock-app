import Card from "../ui/Card";
import Button from "../ui/Button";
import { downloadSalesCsv, downloadSalesDailyCsv } from "../api";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

function GlassTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

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

function formatMoney(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}
function formatMoneyCompact(n) {
  const x = Number(n || 0);
  const abs = Math.abs(x);

  if (abs >= 1_000_000) return `$${(x / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(x / 1_000).toFixed(1)}k`;
  return `$${x.toFixed(2)}`;
}

function toPieData(byPayment = {}) {
  return Object.entries(byPayment).map(([name, value]) => ({
    name,
    value: Number(value || 0),
  }));
}

// colores glass (sin “colores fuertes”, pero diferenciables)
const PIE_COLORS = [
  "rgba(255,255,255,0.85)",
  "rgba(255,255,255,0.65)",
  "rgba(255,255,255,0.45)",
  "rgba(255,255,255,0.30)",
  "rgba(255,255,255,0.22)",
  "rgba(255,255,255,0.15)",
];

export default function ReportsPage({
  reportFrom,
  reportTo,
  setReportFrom,
  setReportTo,
  summary,
  summaryLoading,
  daily,
  dailyLoading,
  loadSummary,
  loadDaily,
}) {
  const pieData = toPieData(summary?.by_payment_method || {});

async function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

  async function onExportCsv() {
    try {
      const blob = await downloadSalesCsv(reportFrom, reportTo);
      await downloadBlob(blob, `ventas_${reportFrom}_a_${reportTo}.csv`);
    } catch (e) {
      // si tenés toast mejor usarlo; si no:
      alert(e.message || "Error exportando CSV");
    }
  }

  async function onExportDailyCsv() {
    try {
      const blob = await downloadSalesDailyCsv(reportFrom, reportTo);
      await downloadBlob(blob, `ventas_diarias_${reportFrom}_a_${reportTo}.csv`);
    } catch (e) {
      alert(e.message || "Error exportando CSV diario");
    }
  }

  return (
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

            <Button type="button" onClick={onExportCsv}>
              Exportar CSV
            </Button>
          </div>
        </div>

        <div className="mt-5">
          {!summary ? (
            <div className="text-white/70">
              Elegí un rango y tocá <span className="text-white/90 font-semibold">“Ver resumen”</span>.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card title="Resumen" className="bg-white/[0.02]">
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

              <Card title="Por medio de pago" className="bg-white/[0.02]">
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

              <Card title="Ventas por día" className="bg-white/[0.02]">
                <div className="flex flex-wrap gap-2 items-center">
                  <Button onClick={loadDaily} disabled={dailyLoading}>
                    {dailyLoading ? "Cargando..." : "Ver diario"}
                  </Button>

                  <Button type="button" onClick={onExportDailyCsv}>
                    Exportar diario CSV
                  </Button>
                </div>

                {!daily ? (
                  <div className="mt-3 text-white/70 text-sm">
                    Tocá <span className="text-white/90 font-semibold">“Ver diario”</span>.
                  </div>
                ) : daily.days.length === 0 ? (
                  <div className="mt-3 text-white/70 text-sm">Sin datos en el rango.</div>
                ) : (
                    <div className="mt-4 space-y-4">
                        {/* KPIs del rango (requiere daily) */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        {(() => {
                            const total = daily.days.reduce((acc, d) => acc + Number(d.total || 0), 0);
                            const count = daily.days.reduce((acc, d) => acc + Number(d.count_sales || 0), 0);
                            const avg = count > 0 ? total / count : 0;

                            const peak = daily.days.reduce(
                            (best, d) => (Number(d.total || 0) > Number(best.total || 0) ? d : best),
                            daily.days[0]
                            );

                            return (
                            <>
                                <Card title="Total del rango" className="bg-white/[0.02]">
                                <div
                                  className="text-2xl font-semibold text-white truncate"
                                  title={formatMoney(total)}
                                >
                                  {formatMoneyCompact(total)}
                                </div>
                                <div className="text-xs text-white/60 mt-1">Suma de ventas por día</div>
                                </Card>

                                <Card title="Ventas (rango)" className="bg-white/[0.02]">
                                <div className="text-2xl font-semibold text-white">{count}</div>
                                <div className="text-xs text-white/60 mt-1">Cantidad de tickets</div>
                                </Card>

                                <Card title="Promedio por venta" className="bg-white/[0.02]">
                                <div
                                  className="text-2xl font-semibold text-white truncate"
                                  title={formatMoney(avg)}
                                >
                                  {formatMoneyCompact(avg)}
                                </div>
                                <div className="text-xs text-white/60 mt-1">Total / cantidad</div>
                                </Card>

                                <Card title="Día pico" className="bg-white/[0.02]">
                                <div className="text-lg font-semibold text-white">
                                    {peak?.date ?? "-"}
                                </div>
                                <div className="text-sm text-white/80 mt-1">
                                    {formatMoneyCompact(peak?.total ?? 0)} · {Number(peak?.count_sales ?? 0)} ventas
                                </div>
                                </Card>
                            </>
                            );
                        })()}
                        </div>

                        {/* Grid charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* BarChart */}
                        <div className="lg:col-span-2 h-72 w-full rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                            <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={daily.days.map((d) => ({
                                date: d.date.slice(5),
                                total: Number(d.total),
                                count: Number(d.count_sales),
                                }))}
                                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid
                                stroke="rgba(255,255,255,0.08)"
                                strokeDasharray="3 3"
                                />

                                <XAxis
                                dataKey="date"
                                tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                />

                                <YAxis
                                tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                />

                                <Tooltip
                                content={<GlassTooltip />}
                                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                                />

                                <Bar
                                dataKey="total"
                                fill="rgba(255,255,255,0.75)"
                                radius={[12, 12, 4, 4]}
                                />
                            </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Donut por medio de pago (usa summary) */}
                        <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                            <div className="text-sm font-semibold text-white/85 mb-2">
                            Distribución por medio
                            </div>

                            {Object.keys(summary?.by_payment_method || {}).length === 0 ? (
                            <div className="text-white/60 text-sm">Sin datos.</div>
                            ) : (
                            <>
                                <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                    <Pie
                                        data={pieData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={52}
                                        outerRadius={78}
                                        paddingAngle={2}
                                    >
                                        {pieData.map((_, idx) => (
                                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                        if (!active || !payload?.length) return null;
                                        const p = payload[0];
                                        return (
                                            <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md px-3 py-2 shadow-xl">
                                            <div className="text-xs text-white/60">{p.name}</div>
                                            <div className="text-sm text-white font-semibold">
                                                {formatMoney(p.value)}
                                            </div>
                                            </div>
                                        );
                                        }}
                                    />
                                    </PieChart>
                                </ResponsiveContainer>
                                </div>

                                {/* leyenda */}
                                <div className="mt-3 space-y-2 text-sm">
                                {pieData
                                    .slice()
                                    .sort((a, b) => b.value - a.value)
                                    .map((it, idx) => (
                                    <div key={it.name} className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full border border-white/10"
                                            style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                                        />
                                        <span className="text-white/70 truncate">{it.name}</span>
                                        </div>
                                        <span className="text-white/90 font-medium">
                                        {formatMoney(it.value)}
                                        </span>
                                    </div>
                                    ))}
                                </div>
                            </>
                            )}
                        </div>
                        </div>

                        {/* Top días */}
                        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                        <div className="text-sm font-semibold text-white/85 mb-2">Top días (por total)</div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            {daily.days
                            .slice()
                            .sort((a, b) => Number(b.total || 0) - Number(a.total || 0))
                            .slice(0, 5)
                            .map((d) => (
                                <div
                                key={d.date}
                                className="rounded-2xl border border-white/10 bg-white/[0.02] p-3"
                                >
                                <div className="text-xs text-white/60">{d.date}</div>
                                <div
                                  className="text-lg font-semibold text-white truncate"
                                  title={formatMoney(d.total)}
                                >
                                  {formatMoneyCompact(d.total)}
                                </div>
                                <div className="text-xs text-white/70 mt-1">
                                    {Number(d.count_sales)} ventas
                                </div>
                                </div>
                            ))}
                        </div>
                        </div>
                    </div>
                    )}
              </Card>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

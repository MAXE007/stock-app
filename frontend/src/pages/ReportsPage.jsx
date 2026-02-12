import Card from "../ui/Card";
import Button from "../ui/Button";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
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

  getSalesCsvUrl,
  getSalesDailyCsvUrl,
}) {
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

                  <a href={getSalesDailyCsvUrl(reportFrom, reportTo)} className="inline-block">
                    <Button type="button">Exportar diario CSV</Button>
                  </a>
                </div>

                {!daily ? (
                  <div className="mt-3 text-white/70 text-sm">
                    Tocá <span className="text-white/90 font-semibold">“Ver diario”</span>.
                  </div>
                ) : daily.days.length === 0 ? (
                  <div className="mt-3 text-white/70 text-sm">Sin datos en el rango.</div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="h-72 w-full rounded-2xl border border-white/10 bg-white/[0.02] p-4">
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

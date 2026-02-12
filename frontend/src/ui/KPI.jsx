export default function KPI({ title, value, hint, icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-white/60">{title}</div>
        {icon ? <div className="text-white/60">{icon}</div> : null}
      </div>

      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>

      {hint ? <div className="mt-1 text-xs text-white/50">{hint}</div> : null}
    </div>
  );
}

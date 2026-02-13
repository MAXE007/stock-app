export default function Card({ title, children, className = "" }) {
  return (
    <section
      className={
        "rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-xl " +
        "backdrop-blur-md " +
        className
      }
    >
      {title && <h2 className="m-0 mb-3 text-base font-semibold text-white/90">{title}</h2>}
      {children}
    </section>
  );
}
export default function Button({ variant = "default", className = "", ...props }) {
  const base =
    "px-4 py-2 rounded-xl border transition font-medium text-sm " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    default: "border-white/10 bg-white/5 hover:bg-white/10 text-white",
    primary: "border-white bg-white text-black hover:bg-white/90",
    danger: "border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15",
  };

  return <button className={base + " " + variants[variant] + " " + className} {...props} />;
}

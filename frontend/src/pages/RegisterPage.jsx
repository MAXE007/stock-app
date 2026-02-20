import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function RegisterPage() {
  const nav = useNavigate();
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await register(email, password); // auto-login dentro del AuthContext
      nav("/app", { replace: true });
    } catch (e2) {
      setErr(e2.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-xl font-semibold text-white">Crear cuenta</h1>
        <p className="mt-1 text-sm text-white/60">
          Registrate para empezar a usar Stock App.
        </p>

        {err && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-red-200">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-sm text-white/70">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
              placeholder="tu@email.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm text-white/70">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
              autoComplete="new-password"
            />
            <div className="mt-1 text-xs text-white/50">
              Mínimo 6 caracteres.
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full rounded-xl border border-white/10 bg-emerald-500/20 px-3 py-2 text-emerald-200 font-medium disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear cuenta"}
          </button>
        </form>

        <div className="mt-4 text-sm text-white/60">
          ¿Ya tenés cuenta?{" "}
          <Link className="text-white/80 underline" to="/login">
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}

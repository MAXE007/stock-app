import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, bootLoading } = useAuth();

  if (bootLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/70">
        Cargando sesión...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}

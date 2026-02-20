import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, getToken, setToken } from "./tokenStorage";
import * as api from "../api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);

  async function boot() {
    const token = getToken();
    if (!token) {
      setUser(null);
      setBootLoading(false);
      return;
    }
    try {
      const me = await api.getMe();
      setUser(me);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setBootLoading(false);
    }
  }

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email, password) {
    const tok = await api.login(email, password);
    setToken(tok.access_token);
    const me = await api.getMe();
    setUser(me);
    return me;
  }

  async function register(email, password) {
    await api.register(email, password);
    return login(email, password); // auto-login
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, bootLoading, login, register, logout }),
    [user, bootLoading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

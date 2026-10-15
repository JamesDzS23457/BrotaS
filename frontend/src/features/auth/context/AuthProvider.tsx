import { useCallback, useMemo, useState, type ReactNode } from "react";

import { clearToken, getToken, setToken } from "../../../shared/api/client";
import { decodeToken } from "../../../shared/api/jwt";
import { login as loginRequest } from "../api/auth";
import { AuthContext, type AuthContextValue, type AuthUser } from "./auth-context";

function userFromToken(token: string | null): AuthUser | null {
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload) return null;
  if (payload.exp * 1000 <= Date.now()) return null;
  return { id: payload.user_id, tenantId: payload.tenant_id, role: payload.role };
}

// Provider de autenticación: guarda el token y el usuario en sesión
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const usuario = userFromToken(getToken());
    if (!usuario) clearToken(); // token inválido o vencido
    return usuario;
  });

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginRequest(email, password);
    setToken(data.access_token);
    setUser(userFromToken(data.access_token));
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, logout }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

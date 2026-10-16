import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { clearToken, getToken, setToken } from "../../../shared/api/client";
import { decodeToken } from "../../../shared/api/jwt";
import { getProfile, login as loginRequest } from "../api/auth";
import { AuthContext, type AuthContextValue, type AuthUser } from "./auth-context";

function userFromToken(token: string | null): AuthUser | null {
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload) return null;
  if (payload.exp * 1000 <= Date.now()) return null;
  return {
    id: payload.user_id,
    tenantId: payload.tenant_id,
    role: payload.role,
    email: null,
    currency: null,
    timezone: null,
  };
}

// Provider de autenticación: guarda el token y el usuario en sesión
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const usuario = userFromToken(getToken());
    if (!usuario) clearToken(); // token inválido o vencido
    return usuario;
  });

  // El correo, la moneda y la zona no viajan en el token: se piden una sola vez
  useEffect(() => {
    let activo = true;
    if (user && user.email === null) {
      getProfile()
        .then((perfil) => {
          if (activo) {
            setUser((actual) =>
              actual
                ? { ...actual, email: perfil.email, currency: perfil.currency, timezone: perfil.timezone }
                : actual,
            );
          }
        })
        .catch(() => {
          // Sin red o sin permiso: se muestra "—" en vez del correo
        });
    }
    return () => {
      activo = false;
    };
  }, [user]);

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

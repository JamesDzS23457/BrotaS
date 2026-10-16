import { createContext } from "react";

export interface AuthUser {
  id: number;
  tenantId: number | null;
  role: string;
  email: string | null;
  currency: string | null;
  timezone: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// Contexto de autenticación (el provider vive en AuthProvider.tsx)
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

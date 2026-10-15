import type { ReactNode } from "react";

import { AuthProvider } from "../features/auth/context/AuthProvider";

// Providers globales de la aplicación
export function AppProviders({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

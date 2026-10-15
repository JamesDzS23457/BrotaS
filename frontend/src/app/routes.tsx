import { Route, Routes } from "react-router-dom";

import ProtectedRoute from "../features/auth/components/ProtectedRoute";
import LoginPage from "../features/auth/pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import NotFoundPage from "./pages/NotFoundPage";

// Rutas de la aplicación: públicas y protegidas
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

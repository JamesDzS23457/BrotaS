import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "../features/auth/hooks/useAuth";
import ProtectedRoute from "../features/auth/components/ProtectedRoute";
import LoginPage from "../features/auth/pages/LoginPage";
import ProductsPage from "../features/products/pages/ProductsPage";
import ReportPage from "../features/reports/pages/ReportPage";
import SalesPage from "../features/sales/pages/SalesPage";
import PanelLayout from "./layout/PanelLayout";
import DashboardPage from "./pages/DashboardPage";
import NotFoundPage from "./pages/NotFoundPage";

// La raíz depende de quién entra: el superadmin (sin local) ve la bienvenida;
// el usuario con local entra directo al panel
function RutaInicial() {
  const { user } = useAuth();
  if (!user?.tenantId) return <DashboardPage />;
  return <Navigate to="/productos" replace />;
}

// Rutas de la aplicación: públicas y protegidas
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<RutaInicial />} />
        <Route element={<PanelLayout />}>
          <Route path="/productos" element={<ProductsPage />} />
          <Route path="/ventas" element={<SalesPage />} />
          <Route path="/reporte" element={<ReportPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

import Button from "../../shared/components/Button";
import { PLATFORM_NAME } from "../../shared/config";
import { useAuth } from "../../features/auth/hooks/useAuth";

// Página inicial protegida (se reemplazará por el panel real)
export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <span className="font-semibold text-emerald-700">{PLATFORM_NAME}</span>
        <Button onClick={logout} className="bg-slate-600 hover:bg-slate-700">
          Cerrar sesión
        </Button>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-xl font-semibold text-slate-800">Sesión iniciada</h1>
        <dl className="mt-4 space-y-2 text-sm text-slate-600">
          <div className="flex gap-2">
            <dt className="font-medium">Usuario:</dt>
            <dd>{user?.id}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium">Rol:</dt>
            <dd>{user?.role ?? "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium">Local:</dt>
            <dd>{user?.tenantId ?? "—"}</dd>
          </div>
        </dl>
        <p className="mt-6 text-sm text-slate-500">
          El panel de inventario se construirá en los próximos pasos.
        </p>
      </main>
    </div>
  );
}

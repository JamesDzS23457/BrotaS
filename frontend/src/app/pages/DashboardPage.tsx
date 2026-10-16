import { useAuth } from "../../features/auth/hooks/useAuth";
import Button from "../../shared/components/Button";
import LogoMark from "../../shared/components/LogoMark";
import { PLATFORM_NAME } from "../../shared/config";

const ROLE_LABELS: Record<string, string> = {
  owner: "Dueño",
  staff: "Empleado",
  superadmin: "Administrador",
};

// Página inicial protegida (se reemplazará por el panel real)
export default function DashboardPage() {
  const { user, logout } = useAuth();

  const datos = [
    { etiqueta: "Correo", valor: user?.email ?? "—" },
    { etiqueta: "Rol", valor: user ? (ROLE_LABELS[user.role] ?? user.role) : "—" },
    { etiqueta: "Local", valor: user?.tenantId ?? "—" },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <header className="border-b border-mist bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-7 w-7" />
            <span className="font-display text-lg font-semibold text-ink">{PLATFORM_NAME}</span>
          </div>
          <Button variant="secondary" onClick={logout} className="shrink-0">
            Cerrar sesión
          </Button>
        </div>
      </header>

      <main id="contenido" className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
          Tu local, listo para empezar
        </h1>
        <p className="mt-3 max-w-xl text-bark">
          Ya iniciaste sesión. Aquí verás el inventario, las ventas y los reportes en cuanto los
          construyamos.
        </p>

        <dl className="mt-10 max-w-2xl divide-y divide-mist rounded-xl border border-mist bg-white">
          {datos.map((dato) => (
            <div
              key={dato.etiqueta}
              className="flex items-baseline justify-between gap-4 px-5 py-4"
            >
              <dt className="text-sm text-bark">{dato.etiqueta}</dt>
              <dd className="min-w-0 break-all font-semibold text-ink">{dato.valor}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold text-ink">Lo que viene</h2>
          <ul className="mt-4 space-y-3 text-bark">
            {[
              "Catálogo de productos con fotos",
              "Entradas y ajustes de stock",
              "Ventas y anulación con devolución de stock",
              "Reportes del día y del mes",
            ].map((texto) => (
              <li key={texto} className="flex gap-3">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-bloom" />
                {texto}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

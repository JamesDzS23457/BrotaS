import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../../../shared/api/client";
import Button from "../../../shared/components/Button";
import EmptyState from "../../../shared/components/EmptyState";
import PageHeader from "../../../shared/components/PageHeader";
import Skeleton from "../../../shared/components/Skeleton";
import { fieldClasses } from "../../../shared/components/field-styles";
import { formatCOP, textoQuedan } from "../../../shared/format";
import { useAuth } from "../../auth/hooks/useAuth";
import { getDailyReport, hoyEnZona, type DailyReport } from "../api/reports";

// Fecha larga en español a partir de 'YYYY-MM-DD', sin desfase de día:
// se fija al mediodía UTC y se formatea también en UTC
function formatearFecha(fechaISO: string): string {
  const fecha = new Date(`${fechaISO}T12:00:00Z`);
  if (Number.isNaN(fecha.getTime())) return fechaISO;
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "full", timeZone: "UTC" }).format(fecha);
}

// Resta un día a 'YYYY-MM-DD' operando sobre el texto (sin zonas horarias)
function diaAnterior(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia - 1)).toISOString().slice(0, 10);
}

const LINK_SECUNDARIO =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-mist bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-stem hover:text-stem";

function IconoVentas() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

function IconoStock() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

// Esqueleto con la forma final: franja de cifras y dos paneles
function CargandoReporte() {
  return (
    <div role="status" className="space-y-6">
      <span className="sr-only">Cargando reporte…</span>
      <div className="grid gap-6 rounded-2xl border border-mist bg-white p-5 sm:p-6 md:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-3/4 max-w-xs" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-12" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {[0, 1].map((panel) => (
          <div key={panel} className="space-y-4 rounded-2xl border border-mist bg-white p-5 sm:p-6">
            <Skeleton className="h-6 w-40" />
            {[0, 1, 2].map((fila) => (
              <div key={fila} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-1.5 w-2/3" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Reporte del día: fecha, totales, más vendidos y stock bajo
export default function ReportPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const zona = user?.timezone ?? "America/Bogota";
  const moneda = user?.currency ?? "COP";

  const [fecha, setFecha] = useState(() => hoyEnZona(zona));
  const [recarga, setRecarga] = useState(0);
  const [reporte, setReporte] = useState<DailyReport | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Los setState viven en la promesa, no directos en el efecto
  useEffect(() => {
    let activo = true;
    getDailyReport(fecha).then(
      (datos) => {
        if (!activo) return;
        setReporte(datos);
        setError(null);
        setCargando(false);
      },
      (err: unknown) => {
        if (!activo) return;
        if (err instanceof ApiError && err.status === 401) {
          logout();
          navigate("/login", { replace: true });
          return;
        }
        setError(err instanceof ApiError ? err.message : "No se pudo cargar. Inténtalo de nuevo.");
        setCargando(false);
      },
    );
    return () => {
      activo = false;
    };
  }, [fecha, recarga, logout, navigate]);

  const hoy = hoyEnZona(zona);
  const ayer = diaAnterior(hoy);

  function elegirFecha(nueva: string) {
    if (!nueva || nueva === fecha) return;
    setCargando(true);
    setError(null);
    setFecha(nueva);
  }

  function reintentar() {
    setCargando(true);
    setError(null);
    setRecarga((n) => n + 1);
  }

  const selectorFecha = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <label htmlFor="fecha" className="block text-sm font-medium text-ink">
          Fecha
        </label>
        <input
          id="fecha"
          type="date"
          value={fecha}
          max={hoy}
          onChange={(e) => elegirFecha(e.target.value)}
          className={fieldClasses(false, "!w-auto")}
        />
      </div>
      <div className="flex gap-2" role="group" aria-label="Atajos de fecha">
        <Button variant="secondary" aria-pressed={fecha === hoy} onClick={() => elegirFecha(hoy)}
          className={fecha === hoy ? "!border-stem !text-stem" : ""}>
          Hoy
        </Button>
        <Button variant="secondary" aria-pressed={fecha === ayer} onClick={() => elegirFecha(ayer)}
          className={fecha === ayer ? "!border-stem !text-stem" : ""}>
          Ayer
        </Button>
      </div>
    </div>
  );

  let contenido;
  if (cargando) {
    contenido = <CargandoReporte />;
  } else if (error) {
    contenido = (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger"
      >
        <p className="min-w-0 flex-1 basis-56">{error}</p>
        <Button variant="secondary" onClick={reintentar}>
          Reintentar
        </Button>
      </div>
    );
  } else if (reporte) {
    const total = Number(reporte.total_sold);
    const ticketPromedio = reporte.sales_count > 0 ? formatCOP(total / reporte.sales_count, moneda) : "—";
    // El servidor ordena el ranking por unidades vendidas: las barras miden lo mismo
    const maxUnidades = Math.max(0, ...reporte.top_products.map((p) => p.quantity));

    contenido = (
      <div className="space-y-6">
        <section aria-labelledby="titulo-resumen" className="grid rounded-2xl border border-mist bg-white md:grid-cols-[1.6fr_1fr]">
          <h2 id="titulo-resumen" className="sr-only">
            Resumen del día
          </h2>
          <div className="min-w-0 p-5 sm:p-6">
            <p className="text-sm font-medium text-bark">Total vendido</p>
            <p className="mt-1 break-words font-display text-4xl font-bold tracking-tighter tabular-nums text-ink sm:text-6xl">
              {formatCOP(reporte.total_sold, moneda)}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-4 border-t border-mist p-5 sm:p-6 md:border-l md:border-t-0">
            <div className="min-w-0">
              <dt className="text-sm font-medium text-bark">Ventas</dt>
              <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">
                {reporte.sales_count}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-sm font-medium text-bark">Ticket promedio</dt>
              <dd className="mt-1 break-words font-display text-2xl font-semibold tabular-nums text-ink">
                {ticketPromedio}
              </dd>
            </div>
          </dl>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section aria-labelledby="titulo-top" className="min-w-0 rounded-2xl border border-mist bg-white p-5 sm:p-6">
            <h2 id="titulo-top" className="font-display text-xl font-semibold text-balance text-ink">
              Más vendidos
            </h2>
            {reporte.top_products.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={<IconoVentas />}
                  title="Sin ventas este día"
                  description="Cuando registres ventas, aquí verás qué productos se llevan el día."
                  action={
                    <Link
                      to="/ventas"
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-mist bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-stem hover:text-stem motion-reduce:transition-none"
                    >
                      Ir a vender
                    </Link>
                  }
                />
              </div>
            ) : (
              <ol className="mt-3 divide-y divide-mist">
                {reporte.top_products.map((item, indice) => {
                  const porcentaje = maxUnidades > 0 ? Math.max(2, (item.quantity / maxUnidades) * 100) : 0;
                  return (
                    <li key={item.product_id} className="flex items-start gap-3 py-3">
                      <span
                        aria-hidden="true"
                        className="w-6 shrink-0 text-center font-display text-lg font-bold tabular-nums text-stem"
                      >
                        {indice + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="min-w-0 truncate text-sm font-semibold text-ink">{item.name}</p>
                          <p className="shrink-0 text-sm font-bold tabular-nums text-ink">
                            {formatCOP(item.revenue, moneda)}
                          </p>
                        </div>
                        <p className="mt-0.5 text-xs tabular-nums text-bark">
                          {item.quantity} {item.quantity === 1 ? "unidad" : "unidades"}
                        </p>
                        <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist/60">
                          <div
                            className="bar-grow h-full rounded-full bg-stem"
                            style={{ width: `${porcentaje}%`, animationDelay: `${indice * 60}ms` }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section aria-labelledby="titulo-stock" className="min-w-0 rounded-2xl border border-mist bg-white p-5 sm:p-6">
            <h2 id="titulo-stock" className="font-display text-xl font-semibold text-balance text-ink">
              Stock bajo
            </h2>
            {reporte.low_stock.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={<IconoStock />}
                  title="Todo con buen nivel"
                  description="Ningún producto está por agotarse."
                />
              </div>
            ) : (
              <>
                <ul className="mt-3 divide-y divide-mist">
                  {reporte.low_stock.map((producto) => (
                    <li key={producto.id} className="flex items-center justify-between gap-3 py-3">
                      <span className="min-w-0 truncate text-sm font-semibold text-ink">{producto.name}</span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                          producto.stock === 0 ? "bg-danger-soft text-danger" : "bg-paper text-ink"
                        }`}
                      >
                        {producto.stock === 0 ? "Agotado" : textoQuedan(producto.stock)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  <Link to="/productos?filtro=bajo" className={LINK_SECUNDARIO}>
                    Ver en productos
                  </Link>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Reporte del día"
        description={formatearFecha(fecha)}
        actions={selectorFecha}
      />
      <div className="mt-6" aria-busy={cargando}>
        {contenido}
      </div>
    </>
  );
}

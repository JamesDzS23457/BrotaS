import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../../shared/api/client";
import Button from "../../../shared/components/Button";
import { formatCOP } from "../../../shared/format";
import { useAuth } from "../../auth/hooks/useAuth";
import { getDailyReport, hoyBogota, type DailyReport } from "../api/reports";

// Reporte del día: fecha, totales, más vendidos y stock bajo
export default function ReportPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [fecha, setFecha] = useState(hoyBogota);
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
  }, [fecha, logout, navigate]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold text-ink">Reporte del día</h1>
        <div className="space-y-1.5">
          <label htmlFor="fecha" className="block text-sm font-medium text-ink">
            Fecha
          </label>
          <input
            id="fecha"
            type="date"
            value={fecha}
            max={hoyBogota()}
            onChange={(e) => {
              if (!e.target.value) return;
              setCargando(true);
              setFecha(e.target.value);
            }}
            className="block rounded-lg border border-mist bg-white px-3 py-2.5 text-ink focus-visible:border-stem"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <p role="status" className="mt-6 text-sm text-bark">
          Cargando…
        </p>
      ) : reporte ? (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <section aria-label="Total vendido" className="rounded-xl border border-mist bg-white p-5">
              <p className="text-sm font-medium text-bark">Total vendido</p>
              <p className="mt-1 font-display text-3xl font-bold text-ink">
                {formatCOP(reporte.total_sold)}
              </p>
            </section>
            <section aria-label="Número de ventas" className="rounded-xl border border-mist bg-white p-5">
              <p className="text-sm font-medium text-bark">Ventas</p>
              <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">
                {reporte.sales_count}
              </p>
            </section>
          </div>

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
            <section aria-labelledby="titulo-top" className="rounded-xl border border-mist bg-white p-5">
              <h2 id="titulo-top" className="font-display text-xl font-semibold text-ink">
                Más vendidos
              </h2>
              {reporte.top_products.length === 0 ? (
                <p className="mt-3 text-sm text-bark">Sin ventas este día.</p>
              ) : (
                <ol className="mt-3 divide-y divide-mist">
                  {reporte.top_products.map((item, indice) => (
                    <li key={item.product_id} className="flex items-center gap-3 py-2.5">
                      <span aria-hidden="true" className="w-6 shrink-0 text-center font-display text-lg font-bold text-stem">
                        {indice + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                        <p className="text-xs text-bark">{item.quantity} unidad(es)</p>
                      </div>
                      <p className="text-sm font-bold tabular-nums text-ink">{formatCOP(item.revenue)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section aria-labelledby="titulo-stock" className="rounded-xl border border-mist bg-white p-5">
              <h2 id="titulo-stock" className="font-display text-xl font-semibold text-ink">
                Stock bajo
              </h2>
              {reporte.low_stock.length === 0 ? (
                <p className="mt-3 text-sm text-bark">Todo con buen nivel. Buen trabajo.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {reporte.low_stock.map((producto) => (
                    <li
                      key={producto.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-danger/40 bg-danger-soft px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-sm font-semibold text-ink">
                        {producto.name}
                      </span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-danger">
                        {producto.stock === 0 ? "Agotado" : `Quedan ${producto.stock}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : null}

      <div className="mt-8">
        <Button variant="secondary" onClick={() => navigate("/ventas")}>
          Ir a vender
        </Button>
      </div>
    </>
  );
}

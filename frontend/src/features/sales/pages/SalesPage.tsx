import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../../shared/api/client";
import Button from "../../../shared/components/Button";
import EmptyState from "../../../shared/components/EmptyState";
import Input from "../../../shared/components/Input";
import PageHeader from "../../../shared/components/PageHeader";
import ProductThumb from "../../../shared/components/ProductThumb";
import Skeleton from "../../../shared/components/Skeleton";
import { formatCOP, textoQuedan } from "../../../shared/format";
import { useAuth } from "../../auth/hooks/useAuth";
import { listProducts, type Product } from "../../products/api/products";
import { PAYMENT_METHODS, createSale, type PaymentMethod, type Sale } from "../api/sales";
import CartPanel, { type CartLine } from "../components/CartPanel";

// Resultado de una consulta de productos; `clave` identifica qué búsqueda lo originó
interface Resultados {
  clave: string;
  items: Product[];
  total: number;
  fallo: boolean;
}

// Pantalla de éxito: el título recibe el foco para que el lector de pantalla anuncie la venta
function SaleSuccess({
  venta,
  resumen,
  currency,
  onNew,
}: {
  venta: Sale;
  resumen: CartLine[];
  currency: string;
  onNew: () => void;
}) {
  const tituloRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  // Sale.items no trae nombres: se toman de las líneas que estaban en el carrito
  const nombres = new Map(resumen.map((linea) => [linea.product.id, linea.product.name]));
  const unidades = venta.items.reduce((n, item) => n + item.quantity, 0);
  const metodo = PAYMENT_METHODS.find((m) => m.value === venta.payment_method)?.label;

  return (
    <section aria-labelledby="titulo-exito" className="mx-auto max-w-md rounded-2xl border border-mist bg-white p-5 sm:p-8">
      <div className="text-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="mx-auto h-16 w-16 text-stem"
        >
          <circle className="check-ring" cx="12" cy="12" r="10" pathLength="64" />
          <path className="check-draw" d="m8.5 12.5 2.5 2.5 5-5.5" pathLength="30" />
        </svg>
        <h1
          ref={tituloRef}
          id="titulo-exito"
          tabIndex={-1}
          className="mt-4 font-display text-3xl font-semibold tracking-tighter text-ink"
        >
          ¡Venta registrada!
        </h1>
        <p className="mt-2 text-sm tabular-nums text-bark">
          Folio #{venta.id} · {unidades} {unidades === 1 ? "unidad" : "unidades"}
          {metodo ? ` · ${metodo}` : ""}
        </p>
        <p className="mt-3 font-display text-4xl font-bold tracking-tighter tabular-nums text-ink">
          {formatCOP(venta.total, currency)}
        </p>
      </div>

      <ul aria-label="Productos vendidos" className="mt-6 divide-y divide-mist border-y border-mist">
        {venta.items.map((item) => (
          <li key={item.id} className="flex items-baseline gap-3 py-3 text-sm">
            <span className="min-w-0 flex-1 truncate font-medium text-ink">
              {nombres.get(item.product_id) ?? `Producto #${item.product_id}`}
            </span>
            <span className="shrink-0 tabular-nums text-bark">× {item.quantity}</span>
            <span className="shrink-0 font-semibold tabular-nums text-ink">
              {formatCOP(Number(item.unit_price) * item.quantity, currency)}
            </span>
          </li>
        ))}
      </ul>

      <Button onClick={onNew} className="mt-6 w-full">
        Nueva venta
      </Button>
    </section>
  );
}

// Nueva venta: buscar, armar el carrito, pagar y confirmar
export default function SalesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const moneda = user?.currency ?? "COP";

  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebida, setBusquedaDebida] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [cargado, setCargado] = useState<Resultados | null>(null);
  const [lineas, setLineas] = useState<CartLine[]>([]);
  const [pago, setPago] = useState<PaymentMethod>("efectivo");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [venta, setVenta] = useState<Sale | null>(null);
  const [resumen, setResumen] = useState<CartLine[]>([]);

  // El buscador espera a que dejes de escribir antes de pedir
  useEffect(() => {
    const temporizador = setTimeout(() => setBusquedaDebida(busqueda.trim()), 400);
    return () => clearTimeout(temporizador);
  }, [busqueda]);

  // Siempre pide (sin texto trae la primera página). Los setState viven en la promesa, no directos en el efecto
  useEffect(() => {
    let activo = true;
    const clave = `${recarga}|${busquedaDebida}`;
    listProducts({ search: busquedaDebida, page: 1, page_size: 8 }).then(
      (datos) => {
        if (!activo) return;
        setCargado({ clave, items: datos.items, total: datos.total, fallo: false });
      },
      (err: unknown) => {
        if (!activo) return;
        if (err instanceof ApiError && err.status === 401) {
          logout();
          navigate("/login", { replace: true });
          return;
        }
        setCargado({ clave, items: [], total: 0, fallo: true });
      },
    );
    return () => {
      activo = false;
    };
  }, [busquedaDebida, recarga, logout, navigate]);

  // "Buscando" se deriva: hay texto sin enviar o los resultados son de otra consulta
  const buscando = busqueda.trim() !== busquedaDebida || cargado?.clave !== `${recarga}|${busquedaDebida}`;
  const sinAnteriores = !cargado || cargado.fallo || cargado.items.length === 0;

  const unidadesCarrito = lineas.reduce((n, l) => n + l.quantity, 0);
  const totalCarrito = lineas.reduce((suma, l) => suma + Number(l.product.price) * l.quantity, 0);

  function limpiarBusqueda() {
    setBusqueda("");
    setBusquedaDebida("");
  }

  function agregar(producto: Product) {
    setError(null);
    setVenta(null);
    setLineas((actuales) => {
      const existente = actuales.find((l) => l.product.id === producto.id);
      if (existente) {
        if (existente.quantity >= producto.stock) return actuales;
        return actuales.map((l) =>
          l.product.id === producto.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...actuales, { product: producto, quantity: 1 }];
    });
  }

  function cambiarCantidad(productId: number, quantity: number) {
    setLineas((actuales) =>
      actuales.map((l) => (l.product.id === productId ? { ...l, quantity } : l)),
    );
  }

  function quitar(productId: number) {
    setLineas((actuales) => actuales.filter((l) => l.product.id !== productId));
  }

  async function confirmar() {
    if (lineas.length === 0) return;
    setGuardando(true);
    setError(null);
    const copia = lineas.map((l) => ({ ...l }));
    try {
      const registrada = await createSale(
        lineas.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
        pago,
      );
      setResumen(copia);
      setVenta(registrada);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      // Aquí cae el "sin stock suficiente": el backend dice cuál y cuánto hay
      setError(err instanceof ApiError ? err.message : "No se pudo registrar. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  function nuevaVenta() {
    setLineas([]);
    setResumen([]);
    setVenta(null);
    setError(null);
    setPago("efectivo");
    setRecarga((n) => n + 1); // trae el stock fresco por si cambió
  }

  if (venta) {
    return <SaleSuccess venta={venta} resumen={resumen} currency={moneda} onNew={nuevaVenta} />;
  }

  let contenido: ReactNode;
  if (!cargado || (buscando && sinAnteriores)) {
    contenido = (
      <ul aria-hidden="true" className="divide-y divide-mist overflow-hidden rounded-2xl border border-mist bg-white">
        {[0, 1, 2, 3].map((n) => (
          <li key={n} className="flex items-center gap-3 px-3 py-3 sm:px-4">
            <Skeleton className="h-12 w-12 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <Skeleton className="h-11 w-20 shrink-0" />
          </li>
        ))}
      </ul>
    );
  } else if (cargado.fallo) {
    contenido = (
      <EmptyState
        title="No pudimos cargar los productos"
        description="Revisa tu conexión e inténtalo de nuevo."
        action={
          <Button variant="secondary" onClick={() => setRecarga((n) => n + 1)}>
            Reintentar
          </Button>
        }
      />
    );
  } else if (cargado.items.length === 0) {
    contenido = busquedaDebida ? (
      <EmptyState
        title="No hay productos con ese nombre"
        description="Revisa la ortografía o prueba con una palabra más corta."
        action={
          <Button variant="secondary" onClick={limpiarBusqueda}>
            Limpiar búsqueda
          </Button>
        }
      />
    ) : (
      <EmptyState
        title="Aún no hay productos para vender"
        description="Crea productos con stock en el inventario y aparecerán aquí."
      />
    );
  } else {
    contenido = (
      <>
        <ul
          aria-busy={buscando}
          className={`divide-y divide-mist overflow-hidden rounded-2xl border border-mist bg-white transition-opacity ${buscando ? "opacity-60" : ""}`}
        >
          {cargado.items.map((producto) => {
            const agotado = producto.stock <= 0;
            const bajo = !agotado && producto.stock <= producto.min_stock;
            const enCarrito = lineas.find((l) => l.product.id === producto.id)?.quantity ?? 0;
            const enTope = enCarrito >= producto.stock;
            return (
              <li key={producto.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                <ProductThumb product={producto} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 break-words text-sm font-semibold text-ink">{producto.name}</p>
                  <p className="mt-0.5 text-sm font-medium tabular-nums text-ink">
                    {formatCOP(producto.price, moneda)}
                  </p>
                  <p
                    className={`mt-0.5 flex items-center gap-1.5 text-xs tabular-nums ${
                      agotado ? "font-semibold text-danger" : bajo ? "font-semibold text-ink" : "text-bark"
                    }`}
                  >
                    {agotado || bajo ? (
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 shrink-0 rounded-full ${agotado ? "bg-danger" : "bg-bloom"}`}
                      />
                    ) : null}
                    <span className="truncate">
                      {agotado ? "Agotado" : bajo ? textoQuedan(producto.stock) : `Stock: ${producto.stock}`}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Button
                    variant="secondary"
                    onClick={() => agregar(producto)}
                    disabled={agotado || enTope}
                    aria-label={`Agregar ${producto.name}`}
                    title={agotado ? "Agotado" : enTope ? `Solo hay ${producto.stock}` : undefined}
                    className="min-h-11 px-3.5"
                  >
                    Agregar
                  </Button>
                  <p className="min-h-4 text-xs tabular-nums text-bark">
                    {enCarrito > 0 ? (
                      <span key={enCarrito} className="pop-in inline-block font-medium text-stem">
                        En carrito: {enCarrito}
                      </span>
                    ) : null}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        {cargado.total > cargado.items.length ? (
          <p className="mt-3 text-sm tabular-nums text-bark">
            Mostrando {cargado.items.length} de {cargado.total}. Escribe para filtrar.
          </p>
        ) : null}
      </>
    );
  }

  return (
    <>
      <PageHeader title="Nueva venta" />

      <div
        className={`mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:pb-0 xl:grid-cols-[minmax(0,1fr)_22rem] ${
          lineas.length > 0 ? "pb-28" : ""
        }`}
      >
        <section aria-labelledby="titulo-buscar" className="min-w-0">
          <h2
            id="titulo-buscar"
            className="flex items-center gap-3 font-display text-xl font-semibold tracking-tighter text-ink"
          >
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest text-sm font-bold tabular-nums text-white"
            >
              1
            </span>
            <span className="sr-only">Paso 1: </span>
            Busca y agrega
          </h2>

          <div className="mt-4">
            <Input
              label="Buscar producto"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Rosa, tulipán…"
              type="search"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <p role="status" className="sr-only">
            {buscando ? "Buscando…" : cargado && !cargado.fallo ? `${cargado.items.length} productos` : ""}
          </p>
          {/* Única región viva del carrito: el resto de cifras se lee al recorrer la pantalla */}
          <p role="status" className="sr-only">
            {lineas.length > 0
              ? `${unidadesCarrito} ${unidadesCarrito === 1 ? "producto" : "productos"} en el carrito. Total ${formatCOP(totalCarrito, moneda)}.`
              : ""}
          </p>

          <div className="mt-4">{contenido}</div>
        </section>

        <CartPanel
          lines={lineas}
          payment={pago}
          saving={guardando}
          currency={moneda}
          error={error}
          onQuantity={cambiarCantidad}
          onRemove={quitar}
          onPayment={setPago}
          onConfirm={confirmar}
        />
      </div>

      {lineas.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-mist bg-white/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs tabular-nums text-bark">
                {unidadesCarrito} {unidadesCarrito === 1 ? "producto" : "productos"}
              </p>
              <p className="truncate font-display text-xl font-bold tracking-tighter tabular-nums text-ink">
                {formatCOP(totalCarrito, moneda)}
              </p>
            </div>
            <a
              href="#carrito"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-stem px-5 text-sm font-semibold text-white transition-colors hover:bg-stem-strong"
            >
              Ver carrito
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}

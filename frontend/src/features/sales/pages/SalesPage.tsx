import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../../shared/api/client";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";
import { formatCOP } from "../../../shared/format";
import { useAuth } from "../../auth/hooks/useAuth";
import { listProducts, type Product } from "../../products/api/products";
import { createSale, type PaymentMethod, type Sale } from "../api/sales";
import CartPanel, { type CartLine } from "../components/CartPanel";

// Nueva venta: buscar, armar el carrito, pagar y confirmar
export default function SalesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const moneda = user?.currency ?? "COP";

  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebida, setBusquedaDebida] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [resultados, setResultados] = useState<Product[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [lineas, setLineas] = useState<CartLine[]>([]);
  const [pago, setPago] = useState<PaymentMethod>("efectivo");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [venta, setVenta] = useState<Sale | null>(null);

  // El buscador espera a que dejes de escribir antes de pedir
  useEffect(() => {
    const temporizador = setTimeout(() => setBusquedaDebida(busqueda.trim()), 400);
    return () => clearTimeout(temporizador);
  }, [busqueda]);

  // Los setState viven en la promesa, no directos en el efecto
  useEffect(() => {
    if (!busquedaDebida) return; // vacío lo limpia el propio buscador (evento)
    let activo = true;
    listProducts({ search: busquedaDebida, page: 1, page_size: 8 }).then(
      (datos) => {
        if (!activo) return;
        setResultados(datos.items);
        setBuscando(false);
      },
      (err: unknown) => {
        if (!activo) return;
        setBuscando(false);
        if (err instanceof ApiError && err.status === 401) {
          logout();
          navigate("/login", { replace: true });
        }
      },
    );
    return () => {
      activo = false;
    };
  }, [busquedaDebida, recarga, logout, navigate]);

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
    try {
      const registrada = await createSale(
        lineas.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
        pago,
      );
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
    setVenta(null);
    setError(null);
    setPago("efectivo");
    setRecarga((n) => n + 1); // trae el stock fresco por si cambió
  }

  if (venta) {
    return (
      <section aria-labelledby="titulo-exito" className="mx-auto max-w-md rounded-xl border border-mist bg-white p-8 text-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mx-auto h-12 w-12 text-stem">
          <circle cx="12" cy="12" r="10" />
          <path d="m8.5 12.5 2.5 2.5 5-5.5" />
        </svg>
        <h1 id="titulo-exito" className="mt-3 font-display text-3xl font-semibold text-ink">
          ¡Venta registrada!
        </h1>
        <p className="mt-2 text-bark">
          Folio #{venta.id} · {venta.items.reduce((n, i) => n + i.quantity, 0)} producto(s)
        </p>
        <p className="mt-1 font-display text-2xl font-bold text-ink">{formatCOP(venta.total, moneda)}</p>
        <Button onClick={nuevaVenta} className="mt-6 w-full">
          Nueva venta
        </Button>
      </section>
    );
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold text-ink">Nueva venta</h1>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="titulo-buscar">
          <h2 id="titulo-buscar" className="text-sm font-medium text-ink">
            1. Busca y agrega productos
          </h2>
          <div className="mt-2">
            <Input
              label="Buscar producto"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                if (!e.target.value.trim()) {
                  setResultados([]);
                  setBuscando(false);
                } else {
                  setBuscando(true);
                }
              }}
              placeholder="Rosa, tulipán…"
              type="search"
            />
          </div>

          <div className="mt-3" aria-live="polite">
            {buscando ? (
              <p className="text-sm text-bark">Buscando…</p>
            ) : !busquedaDebida ? (
              <p className="text-sm text-bark">Escribe para ver productos con stock.</p>
            ) : resultados.length === 0 ? (
              <p className="text-sm text-bark">Nada con ese nombre.</p>
            ) : (
              <ul className="divide-y divide-mist rounded-xl border border-mist bg-white">
                {resultados.map((producto) => {
                  const agotado = producto.stock <= 0;
                  const enCarrito = lineas.find((l) => l.product.id === producto.id)?.quantity ?? 0;
                  return (
                    <li key={producto.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{producto.name}</p>
                        <p className="text-xs text-bark">
                          {formatCOP(producto.price, moneda)} · Stock: {producto.stock}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => agregar(producto)}
                        disabled={agotado || enCarrito >= producto.stock}
                        title={agotado ? "Agotado" : enCarrito >= producto.stock ? `Solo hay ${producto.stock}` : undefined}
                        className="shrink-0 px-3 py-1.5"
                      >
                        {agotado ? "Agotado" : "Agregar"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <div>
          <h2 className="text-sm font-medium text-ink">2. Cobra</h2>
          <div className="mt-2">
            <CartPanel
              lines={lineas}
              payment={pago}
              saving={guardando}
              currency={moneda}
              onQuantity={cambiarCantidad}
              onRemove={quitar}
              onPayment={setPago}
              onConfirm={confirmar}
            />
          </div>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}

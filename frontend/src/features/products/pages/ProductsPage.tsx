import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../../shared/api/client";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  listProducts,
  moveStock,
  type Product,
} from "../api/products";
import ProductCard from "../components/ProductCard";
import ProductFormModal from "../components/ProductFormModal";

const PAGE_SIZE = 12;

// Catálogo del local: tarjetas, buscador, modal de crear/editar y stock rápido
export default function ProductsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === "owner";

  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebida, setBusquedaDebida] = useState("");
  const [pagina, setPagina] = useState(1);
  const [recarga, setRecarga] = useState(0);
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [paginas, setPaginas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ abierto: boolean; producto: Product | null }>({
    abierto: false,
    producto: null,
  });
  const [stockEnCurso, setStockEnCurso] = useState<number | null>(null);

  // El buscador espera a que dejes de escribir antes de pedir
  useEffect(() => {
    const temporizador = setTimeout(() => {
      setBusquedaDebida(busqueda.trim());
      setPagina(1);
    }, 400);
    return () => clearTimeout(temporizador);
  }, [busqueda]);

  // Los datos se piden al montar y cuando cambian búsqueda, página o recarga.
  // Los setState viven en la promesa (no directos en el efecto) y el "cargando"
  // se prende en los eventos que disparan la recarga.
  useEffect(() => {
    let activo = true;
    listProducts({
      search: busquedaDebida || undefined,
      page: pagina,
      page_size: PAGE_SIZE,
    }).then(
      (datos) => {
        if (!activo) return;
        setItems(datos.items);
        setTotal(datos.total);
        setPaginas(datos.pages);
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
  }, [busquedaDebida, pagina, recarga, logout, navigate]);

  async function ajustarStock(producto: Product, delta: 1 | -1) {
    setStockEnCurso(producto.id);
    setError(null);
    try {
      const movimiento = await moveStock(producto.id, delta, "ajuste");
      setItems((actuales) =>
        actuales.map((item) =>
          item.id === producto.id ? { ...item, stock: movimiento.stock_after } : item,
        ),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo ajustar el stock.");
    } finally {
      setStockEnCurso(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Productos</h1>
          <p className="mt-1 text-sm text-bark" role="status">
            {cargando ? "Cargando…" : `${total} producto${total === 1 ? "" : "s"}`}
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setModal({ abierto: true, producto: null })}>
            Nuevo producto
          </Button>
        ) : null}
      </div>

      <div className="mt-5 max-w-md">
        <Input
          label="Buscar"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setCargando(true);
          }}
          placeholder="Busca por nombre…"
          type="search"
        />
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {!cargando && items.length === 0 ? (
        <div className="mt-8 rounded-xl border border-mist bg-white px-5 py-10 text-center">
          <p className="font-medium text-ink">Sin productos por aquí</p>
          <p className="mt-1 text-sm text-bark">
            {busquedaDebida
              ? "Prueba con otro nombre."
              : canManage
                ? "Crea el primero con el botón de arriba."
                : "Todavía no hay productos en este local."}
          </p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((producto) => (
          <ProductCard
            key={producto.id}
            product={producto}
            currency={user?.currency}
            canManage={canManage}
            stockBusy={stockEnCurso === producto.id}
            onEdit={(p) => setModal({ abierto: true, producto: p })}
            onStock={ajustarStock}
          />
        ))}
      </div>

      {paginas > 1 ? (
        <nav aria-label="Paginación" className="mt-8 flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            disabled={pagina <= 1}
            onClick={() => {
              setCargando(true);
              setPagina((p) => Math.max(1, p - 1));
            }}
          >
            Anterior
          </Button>
          <span className="text-sm text-bark" aria-live="polite">
            Página {pagina} de {paginas}
          </span>
          <Button
            variant="secondary"
            disabled={pagina >= paginas}
            onClick={() => {
              setCargando(true);
              setPagina((p) => Math.min(paginas, p + 1));
            }}
          >
            Siguiente
          </Button>
        </nav>
      ) : null}

      {modal.abierto ? (
        <ProductFormModal
          product={modal.producto}
          currency={user?.currency}
          onClose={() => setModal({ abierto: false, producto: null })}
          onSaved={() => {
            setModal({ abierto: false, producto: null });
            setCargando(true);
            setRecarga((n) => n + 1);
          }}
        />
      ) : null}
    </>
  );
}

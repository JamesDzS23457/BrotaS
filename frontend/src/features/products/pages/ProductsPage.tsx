import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { ApiError } from "../../../shared/api/client";
import Button from "../../../shared/components/Button";
import EmptyState from "../../../shared/components/EmptyState";
import Input from "../../../shared/components/Input";
import PageHeader from "../../../shared/components/PageHeader";
import Select from "../../../shared/components/Select";
import Skeleton from "../../../shared/components/Skeleton";
import Toast from "../../../shared/components/Toast";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  listCategories,
  listLowStock,
  listProducts,
  moveStock,
  type Category,
  type Product,
} from "../api/products";
import ProductCard from "../components/ProductCard";
import ProductFormModal from "../components/ProductFormModal";
import ProductRow from "../components/ProductRow";

const PAGE_SIZE = 12;
const CLAVE_VISTA = "brotas_vista_productos";

type Vista = "tarjetas" | "lista";

interface ListaCargada {
  clave: string;
  items: Product[];
  total: number;
  paginas: number;
}

interface Aviso {
  mensaje: string;
  deshacer?: () => void;
}

function vistaGuardada(): Vista {
  try {
    return localStorage.getItem(CLAVE_VISTA) === "lista" ? "lista" : "tarjetas";
  } catch {
    return "tarjetas";
  }
}

const SEGMENTO =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[0.6rem] px-3.5 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stem";

function claseSegmento(activo: boolean) {
  return `${SEGMENTO} ${activo ? "bg-forest text-white" : "text-bark hover:bg-paper hover:text-ink"}`;
}

function IconoTarjetas() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconoLista() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

function IconoCaja() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  );
}

function IconoBusqueda() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

// Catálogo del local: tarjetas o lista, buscador, filtros, stock rápido con deshacer
export default function ProductsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const canManage = user?.role === "owner";

  // Todo el estado de la vista vive en la URL: se puede compartir y el botón Atrás funciona
  const q = params.get("q") ?? "";
  const categoria = Number(params.get("categoria")) || null;
  const soloBajos = params.get("filtro") === "bajo";
  const vista: Vista =
    params.get("vista") === "lista" || params.get("vista") === "tarjetas"
      ? (params.get("vista") as Vista)
      : vistaGuardada();
  const pagina = Math.max(1, Number(params.get("pagina")) || 1);

  const [busqueda, setBusqueda] = useState(q);

  // Si la URL cambia desde fuera (Atrás, un enlace), el campo de búsqueda la sigue
  const [qPrevio, setQPrevio] = useState(q);
  if (q !== qPrevio) {
    setQPrevio(q);
    if (q !== busqueda.trim()) setBusqueda(q);
  }
  const [recarga, setRecarga] = useState(0);
  const [recargaBajos, setRecargaBajos] = useState(0);
  const [lista, setLista] = useState<ListaCargada | null>(null);
  const [errorLista, setErrorLista] = useState<{ clave: string; mensaje: string } | null>(null);
  const [bajosCargados, setBajosCargados] = useState<Product[] | null>(null);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [modal, setModal] = useState<{ abierto: boolean; producto: Product | null }>({
    abierto: false,
    producto: null,
  });
  const [stockEnCurso, setStockEnCurso] = useState<number | null>(null);
  const [errorStock, setErrorStock] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const cambiar = useCallback(
    (cambios: Record<string, string | null>, opciones: { reemplazar?: boolean } = {}) => {
      setParams(
        (previos) => {
          const nuevos = new URLSearchParams(previos);
          for (const [clave, valor] of Object.entries(cambios)) {
            if (valor === null || valor === "") nuevos.delete(clave);
            else nuevos.set(clave, valor);
          }
          if (!("pagina" in cambios)) nuevos.delete("pagina");
          return nuevos;
        },
        { replace: opciones.reemplazar ?? false },
      );
    },
    [setParams],
  );

  // El buscador espera a que dejes de escribir antes de tocar la URL
  useEffect(() => {
    const temporizador = setTimeout(() => {
      if (busqueda.trim() !== q) cambiar({ q: busqueda.trim() }, { reemplazar: true });
    }, 400);
    return () => clearTimeout(temporizador);
  }, [busqueda, q, cambiar]);

  const cerrarSesionSiVencio = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return true;
      }
      return false;
    },
    [logout, navigate],
  );

  // Las categorías se piden una vez: sirven para el filtro y para rotular cada producto
  useEffect(() => {
    let activo = true;
    listCategories().then(
      (datos) => {
        if (activo) setCategorias(datos.filter((c) => c.is_active));
      },
      () => {
        // Sin categorías la pantalla sigue funcionando
      },
    );
    return () => {
      activo = false;
    };
  }, []);

  // Productos con stock bajo: dan el contador y alimentan el filtro «Stock bajo»
  useEffect(() => {
    let activo = true;
    listLowStock().then(
      (datos) => {
        if (activo) setBajosCargados(datos);
      },
      (err: unknown) => {
        if (activo) cerrarSesionSiVencio(err);
      },
    );
    return () => {
      activo = false;
    };
  }, [recargaBajos, cerrarSesionSiVencio]);

  // Lista paginada (cuando no se filtra por stock bajo). «Cargando» se deduce de la clave:
  // si lo cargado no corresponde a lo pedido, aún no llega.
  const claveLista = `${q}|${categoria ?? ""}|${pagina}|${recarga}`;
  useEffect(() => {
    if (soloBajos) return;
    let activo = true;
    listProducts({
      search: q || undefined,
      category_id: categoria ?? undefined,
      page: pagina,
      page_size: PAGE_SIZE,
    }).then(
      (datos) => {
        if (!activo) return;
        setLista({ clave: claveLista, items: datos.items, total: datos.total, paginas: datos.pages });
        setErrorLista(null);
      },
      (err: unknown) => {
        if (!activo || cerrarSesionSiVencio(err)) return;
        setErrorLista({
          clave: claveLista,
          mensaje: err instanceof ApiError ? err.message : "No se pudo cargar. Inténtalo de nuevo.",
        });
      },
    );
    return () => {
      activo = false;
    };
  }, [soloBajos, q, categoria, pagina, claveLista, cerrarSesionSiVencio]);

  const bajos = useMemo(() => bajosCargados ?? [], [bajosCargados]);
  const nombresCategoria = useMemo(
    () => new Map(categorias.map((c) => [c.id, c.name])),
    [categorias],
  );

  const visibles = useMemo(() => {
    if (!soloBajos) return lista?.items ?? [];
    const texto = q.toLowerCase();
    return bajos.filter(
      (p) =>
        (!texto || p.name.toLowerCase().includes(texto)) &&
        (categoria === null || p.category_id === categoria),
    );
  }, [soloBajos, lista, bajos, q, categoria]);

  const errorVisible = soloBajos ? null : errorLista?.clave === claveLista ? errorLista.mensaje : null;
  const cargando = soloBajos ? bajosCargados === null : lista?.clave !== claveLista && !errorVisible;
  const total = soloBajos ? visibles.length : (lista?.total ?? 0);
  const paginas = soloBajos ? 0 : (lista?.paginas ?? 0);
  const hayFiltros = q !== "" || categoria !== null || soloBajos;

  function aplicarStock(id: number, stock: number) {
    setLista((actual) =>
      actual
        ? { ...actual, items: actual.items.map((p) => (p.id === id ? { ...p, stock } : p)) }
        : actual,
    );
    setBajosCargados((actual) =>
      actual ? actual.map((p) => (p.id === id ? { ...p, stock } : p)) : actual,
    );
  }

  async function ajustarStock(producto: Product, delta: 1 | -1, esDeshacer = false) {
    setStockEnCurso(producto.id);
    setErrorStock(null);
    try {
      const movimiento = await moveStock(producto.id, delta, "ajuste");
      aplicarStock(producto.id, movimiento.stock_after);
      setRecargaBajos((n) => n + 1);
      const actual = { ...producto, stock: movimiento.stock_after };
      setAviso(
        esDeshacer
          ? { mensaje: `Cambio deshecho. ${producto.name}: ${movimiento.stock_after} en stock.` }
          : {
              mensaje: `${delta > 0 ? "Sumaste 1 a" : "Quitaste 1 de"} ${producto.name}. Ahora hay ${movimiento.stock_after}.`,
              deshacer: () => void ajustarStock(actual, delta > 0 ? -1 : 1, true),
            },
      );
    } catch (err) {
      if (cerrarSesionSiVencio(err)) return;
      setErrorStock(err instanceof ApiError ? err.message : "No se pudo ajustar el stock.");
    } finally {
      setStockEnCurso(null);
    }
  }

  function cambiarVista(nueva: Vista) {
    try {
      localStorage.setItem(CLAVE_VISTA, nueva);
    } catch {
      // Sin almacenamiento solo se pierde la preferencia
    }
    cambiar({ vista: nueva }, { reemplazar: true });
  }

  function limpiarFiltros() {
    setBusqueda("");
    cambiar({ q: null, categoria: null, filtro: null });
  }

  const descripcion = cargando
    ? "Cargando…"
    : soloBajos
      ? `${total} ${total === 1 ? "producto con stock bajo" : "productos con stock bajo"}`
      : `${total} ${total === 1 ? "producto" : "productos"}${hayFiltros ? " con estos filtros" : ""}`;

  const props = (producto: Product) => ({
    product: producto,
    currency: user?.currency,
    categoryName: producto.category_id ? nombresCategoria.get(producto.category_id) : undefined,
    canManage,
    stockBusy: stockEnCurso === producto.id,
    onEdit: (p: Product) => setModal({ abierto: true, producto: p }),
    onStock: (p: Product, delta: 1 | -1) => void ajustarStock(p, delta),
  });

  return (
    <>
      <PageHeader
        title="Productos"
        description={<span role="status">{descripcion}</span>}
        actions={
          canManage ? (
            <Button onClick={() => setModal({ abierto: true, producto: null })}>
              Nuevo producto
            </Button>
          ) : null
        }
      />

      <div className="mt-6 flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <Input
            label="Buscar productos"
            hideLabel
            name="q"
            autoComplete="off"
            spellCheck={false}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Busca por nombre…"
            type="search"
          />
          <Select
            label="Filtrar por categoría"
            hideLabel
            name="categoria"
            value={categoria?.toString() ?? ""}
            onChange={(e) => cambiar({ categoria: e.target.value || null })}
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Qué productos ver" className="inline-flex rounded-xl border border-mist bg-white p-1">
            <button
              type="button"
              aria-pressed={!soloBajos}
              onClick={() => cambiar({ filtro: null })}
              className={claseSegmento(!soloBajos)}
            >
              Todos
            </button>
            <button
              type="button"
              aria-pressed={soloBajos}
              onClick={() => cambiar({ filtro: "bajo" })}
              className={claseSegmento(soloBajos)}
            >
              Stock bajo
              {bajos.length > 0 ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                    soloBajos ? "bg-white/20 text-white" : "bg-danger-soft text-danger"
                  }`}
                >
                  <span className="sr-only">: </span>
                  {bajos.length}
                </span>
              ) : null}
            </button>
          </div>

          <div role="group" aria-label="Forma de ver los productos" className="inline-flex rounded-xl border border-mist bg-white p-1">
            <button
              type="button"
              aria-pressed={vista === "tarjetas"}
              onClick={() => cambiarVista("tarjetas")}
              className={claseSegmento(vista === "tarjetas")}
            >
              <IconoTarjetas />
              Tarjetas
            </button>
            <button
              type="button"
              aria-pressed={vista === "lista"}
              onClick={() => cambiarVista("lista")}
              className={claseSegmento(vista === "lista")}
            >
              <IconoLista />
              Lista
            </button>
          </div>
        </div>
      </div>

      {errorVisible || errorStock ? (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <span>{errorVisible ?? errorStock}</span>
          {errorVisible ? (
            <Button variant="secondary" onClick={() => setRecarga((n) => n + 1)}>
              Reintentar
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5">
        {cargando ? (
          <div>
            <span className="sr-only">Cargando productos…</span>
            {vista === "tarjetas" ? (
              <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-mist bg-white">
                    <Skeleton className="aspect-[16/10] !rounded-none" />
                    <div className="space-y-3 p-4">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-11 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div aria-hidden="true" className="divide-y divide-mist overflow-hidden rounded-2xl border border-mist bg-white">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="h-14 w-14 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/5" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="hidden h-11 w-32 sm:block" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : !errorVisible && visibles.length === 0 ? (
          soloBajos && q === "" && categoria === null ? (
            <EmptyState
              icon={<IconoCaja />}
              title="Todo con buen nivel"
              description="Ningún producto está en su stock mínimo ni agotado."
              action={
                <Button variant="secondary" onClick={() => cambiar({ filtro: null })}>
                  Ver todos los productos
                </Button>
              }
            />
          ) : hayFiltros ? (
            <EmptyState
              icon={<IconoBusqueda />}
              title="No encontramos productos"
              description="Prueba con otro nombre o quita los filtros para ver todo el catálogo."
              action={
                <Button variant="secondary" onClick={limpiarFiltros}>
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<IconoCaja />}
              title="Aún no hay productos"
              description={
                canManage
                  ? "Crea el primero y empieza a controlar tu inventario."
                  : "Cuando el dueño cree productos, aparecerán aquí."
              }
              action={
                canManage ? (
                  <Button onClick={() => setModal({ abierto: true, producto: null })}>
                    Crear el primer producto
                  </Button>
                ) : null
              }
            />
          )
        ) : vista === "tarjetas" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibles.map((producto) => (
              <ProductCard key={producto.id} {...props(producto)} />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-mist overflow-hidden rounded-2xl border border-mist bg-white">
            {visibles.map((producto) => (
              <ProductRow key={producto.id} {...props(producto)} />
            ))}
          </ul>
        )}
      </div>

      {paginas > 1 ? (
        <nav aria-label="Paginación" className="mt-8 flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            disabled={pagina <= 1}
            onClick={() => cambiar({ pagina: String(Math.max(1, pagina - 1)) })}
          >
            Anterior
          </Button>
          <span className="text-sm tabular-nums text-bark" aria-live="polite">
            Página {pagina} de {paginas}
          </span>
          <Button
            variant="secondary"
            disabled={pagina >= paginas}
            onClick={() => cambiar({ pagina: String(Math.min(paginas, pagina + 1)) })}
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
          onSaved={(guardado, creado) => {
            setModal({ abierto: false, producto: null });
            setRecarga((n) => n + 1);
            setRecargaBajos((n) => n + 1);
            setAviso({
              mensaje: creado
                ? `Creaste «${guardado.name}». Súmale stock desde la lista.`
                : `Guardaste los cambios de «${guardado.name}».`,
            });
          }}
        />
      ) : null}

      <Toast
        message={aviso?.mensaje ?? null}
        actionLabel={aviso?.deshacer ? "Deshacer" : undefined}
        onAction={
          aviso?.deshacer
            ? () => {
                const deshacer = aviso.deshacer;
                setAviso(null);
                deshacer?.();
              }
            : undefined
        }
        onDismiss={() => setAviso(null)}
      />
    </>
  );
}

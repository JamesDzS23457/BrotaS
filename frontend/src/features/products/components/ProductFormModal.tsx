import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";

import { ApiError } from "../../../shared/api/client";
import { parsePrecio } from "../../../shared/format";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import Select from "../../../shared/components/Select";
import Textarea from "../../../shared/components/Textarea";
import {
  createProduct,
  listCategories,
  updateProduct,
  uploadProductImage,
  type Category,
  type Product,
} from "../api/products";

const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];
const MAX_FOTO_BYTES = 3 * 1024 * 1024;
// Los mismos topes del backend: 12 dígitos con 2 decimales y el entero de la base
const MAX_PRECIO = 9_999_999_999.99;
const MAX_MINIMO = 1_000_000;

type CampoConError = "name" | "price" | "min_stock" | "foto";
type Errores = Partial<Record<CampoConError, string>>;

// Cuenta los decimales del número ya leído (25.555 → 3)
function decimales(numero: number): number {
  return numero.toString().split(".")[1]?.length ?? 0;
}

// Formulario modal para crear o editar un producto, con foto y vista previa
export default function ProductFormModal({
  product,
  currency = "COP",
  onClose,
  onSaved,
}: {
  product: Product | null;
  currency?: string | null;
  onClose: () => void;
  onSaved: (producto: Product, creado: boolean) => void;
}) {
  const editando = product !== null;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const empezoFuera = useRef(false);
  const [nombre, setNombre] = useState(product?.name ?? "");
  const [precio, setPrecio] = useState(product?.price ?? "");
  const [descripcion, setDescripcion] = useState(product?.description ?? "");
  const [categoria, setCategoria] = useState(product?.category_id?.toString() ?? "");
  const [minimo, setMinimo] = useState(String(product?.min_stock ?? 0));
  const [publicado, setPublicado] = useState(product?.is_published ?? false);
  const [foto, setFoto] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(product?.image_url ?? null);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);

  // ¿Hay algo escrito que se perdería al cerrar? (incluye la foto elegida)
  const sucio =
    nombre !== (product?.name ?? "") ||
    precio !== (product?.price ?? "") ||
    descripcion !== (product?.description ?? "") ||
    categoria !== (product?.category_id?.toString() ?? "") ||
    minimo !== String(product?.min_stock ?? 0) ||
    publicado !== (product?.is_published ?? false) ||
    foto !== null;

  // El <dialog> nativo mantiene el foco dentro, inhabilita el fondo y atiende Escape
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    let activo = true;
    listCategories()
      .then((lista) => {
        if (activo) setCategorias(lista.filter((c) => c.is_active));
      })
      .catch(() => {
        // Sin categorías no se bloquea el formulario
      });
    return () => {
      activo = false;
    };
  }, []);

  // El error que viene del servidor se anuncia y recibe el foco
  useEffect(() => {
    if (errorGeneral) errorRef.current?.focus();
  }, [errorGeneral]);

  // La vista previa vive mientras el modal está abierto
  useEffect(() => {
    return () => {
      if (vistaPrevia && vistaPrevia.startsWith("blob:")) URL.revokeObjectURL(vistaPrevia);
    };
  }, [vistaPrevia]);

  function estaFuera(evento: MouseEvent<HTMLDialogElement>) {
    const caja = evento.currentTarget.getBoundingClientRect();
    return (
      evento.clientX < caja.left ||
      evento.clientX > caja.right ||
      evento.clientY < caja.top ||
      evento.clientY > caja.bottom
    );
  }

  // Solo cierra si el clic empezó Y terminó fuera: arrastrar desde un campo no pierde lo escrito
  function alPresionar(evento: MouseEvent<HTMLDialogElement>) {
    empezoFuera.current = estaFuera(evento);
  }

  function alHacerClic(evento: MouseEvent<HTMLDialogElement>) {
    if (empezoFuera.current && estaFuera(evento)) pedirCerrar();
    empezoFuera.current = false;
  }

  // Cerrar con cambios de por medio pregunta primero
  function pedirCerrar() {
    if (guardando) return;
    if (sucio) setConfirmandoSalida(true);
    else onClose();
  }

  function quitarError(campo: CampoConError) {
    setErrores((actuales) => {
      if (!actuales[campo]) return actuales;
      const siguientes = { ...actuales };
      delete siguientes[campo];
      return siguientes;
    });
  }

  // Revisa cada campo por separado para poder marcar el que falla
  function revisarCampos(): Errores {
    const nuevos: Errores = {};

    if (!nombre.trim()) nuevos.name = "Escribe el nombre del producto.";

    const precioNumero = parsePrecio(precio);
    if (!precio.trim()) nuevos.price = "Escribe el precio.";
    else if (precioNumero === null || precioNumero < 0) {
      nuevos.price = "Usa un número mayor o igual a cero. Ejemplo: 25.000";
    } else if (decimales(precioNumero) > 2) {
      nuevos.price = "El precio admite máximo dos decimales.";
    } else if (precioNumero > MAX_PRECIO) {
      nuevos.price = "El precio es demasiado alto.";
    }

    const minimoNumero = Number(minimo);
    if (!minimo.trim()) nuevos.min_stock = "Escribe el stock mínimo (puede ser 0).";
    else if (!Number.isInteger(minimoNumero) || minimoNumero < 0) {
      nuevos.min_stock = "Usa un número entero mayor o igual a cero.";
    } else if (minimoNumero > MAX_MINIMO) {
      nuevos.min_stock = `No puede pasar de ${MAX_MINIMO.toLocaleString("es-CO")}.`;
    }

    return nuevos;
  }

  function enfocarCampo(campo: CampoConError) {
    const elemento = formRef.current?.elements.namedItem(campo);
    if (elemento instanceof HTMLElement) elemento.focus();
  }

  function elegirFoto(archivo: File | undefined) {
    if (!archivo) return;
    if (!TIPOS_FOTO.includes(archivo.type)) {
      setErrores((actuales) => ({ ...actuales, foto: "La foto debe ser jpg, png o webp." }));
      return;
    }
    if (archivo.size > MAX_FOTO_BYTES) {
      setErrores((actuales) => ({ ...actuales, foto: "La foto no puede pasar de 3 MB." }));
      return;
    }
    quitarError("foto");
    setFoto(archivo);
    setVistaPrevia((anterior) => {
      if (anterior && anterior.startsWith("blob:")) URL.revokeObjectURL(anterior);
      return URL.createObjectURL(archivo);
    });
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (guardando) return;
    setErrorGeneral(null);

    const encontrados = revisarCampos();
    setErrores(encontrados);
    const primerCampo = (Object.keys(encontrados) as CampoConError[])[0];
    if (primerCampo) {
      enfocarCampo(primerCampo);
      return;
    }

    setGuardando(true);
    try {
      const datos = {
        name: nombre.trim(),
        description: descripcion.trim() || null,
        price: parsePrecio(precio)!.toFixed(2),
        category_id: categoria === "" ? null : Number(categoria),
        min_stock: Number(minimo),
        is_published: publicado,
      };
      const guardado =
        editando && product ? await updateProduct(product.id, datos) : await createProduct(datos);
      if (foto) await uploadProductImage(guardado.id, foto);
      onSaved(guardado, !editando);
    } catch (err) {
      setErrorGeneral(
        err instanceof ApiError ? err.message : "No se pudo guardar. Inténtalo de nuevo.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="titulo-producto"
      onKeyDown={(evento) => {
        // Escape se atiende aquí: el navegador puede cerrar el modal en el mismo instante
        if (evento.key !== "Escape") return;
        evento.preventDefault();
        if (confirmandoSalida) setConfirmandoSalida(false);
        else pedirCerrar();
      }}
      onCancel={(evento) => {
        // Otras peticiones de cierre del navegador también preguntan antes de perder lo escrito
        evento.preventDefault();
        pedirCerrar();
      }}
      onMouseDown={alPresionar}
      onClick={alHacerClic}
      className="dialog-in m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-mist bg-white p-0 text-ink shadow-[0_24px_60px_-20px_rgb(32_52_61_/_0.45)] backdrop:bg-ink/45 backdrop:backdrop-blur-sm"
    >
      <div className="p-5 sm:p-7">
        {confirmandoSalida ? (
          <>
            <h2
              id="titulo-producto"
              className="font-display text-2xl font-semibold tracking-tighter text-ink"
            >
              ¿Descartar los cambios?
            </h2>
            <p className="mt-2 text-sm text-bark">
              Lo que escribiste en este producto no se va a guardar.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                autoFocus
                onClick={() => setConfirmandoSalida(false)}
              >
                Seguir editando
              </Button>
              <Button onClick={onClose}>Descartar cambios</Button>
            </div>
          </>
        ) : (
          <>
            <h2
              id="titulo-producto"
              className="font-display text-2xl font-semibold tracking-tighter text-ink"
            >
              {editando ? "Editar producto" : "Nuevo producto"}
            </h2>
            <p className="mt-1 text-sm text-bark">
              {editando
                ? "Cambia lo que necesites y guarda."
                : "El stock empieza en cero: súmalo desde la lista cuando llegue mercancía."}
            </p>

            <form
              ref={formRef}
              onSubmit={guardar}
              noValidate
              className="mt-6 space-y-4"
            >
              <Input
                label="Nombre"
                name="name"
                autoComplete="off"
                autoFocus
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  quitarError("name");
                }}
                error={errores.name}
                placeholder="Ramo de rosas…"
                maxLength={160}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={`Precio (${currency ?? "COP"})`}
                  name="price"
                  autoComplete="off"
                  value={precio}
                  onChange={(e) => {
                    setPrecio(e.target.value);
                    quitarError("price");
                  }}
                  error={errores.price}
                  placeholder="25.000"
                  inputMode="decimal"
                  required
                />
                <Input
                  label="Stock mínimo"
                  name="min_stock"
                  autoComplete="off"
                  value={minimo}
                  onChange={(e) => {
                    setMinimo(e.target.value);
                    quitarError("min_stock");
                  }}
                  error={errores.min_stock}
                  inputMode="numeric"
                  required
                />
              </div>

              <Textarea
                label="Descripción (opcional)"
                name="description"
                autoComplete="off"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
                maxLength={2000}
              />

              <Select
                label="Categoría"
                name="category"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              >
                <option value="">Sin categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>

              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-mist px-3.5 text-sm font-medium text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-stem">
                <input
                  type="checkbox"
                  checked={publicado}
                  onChange={(e) => setPublicado(e.target.checked)}
                  className="h-4 w-4 accent-stem"
                />
                Visible en el catálogo público
              </label>

              <div className="space-y-1.5">
                <span id="etiqueta-foto" className="block text-sm font-medium text-ink">
                  Foto (opcional)
                </span>
                <div className="flex items-center gap-4">
                  <div
                    aria-hidden="true"
                    className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-mist/50 text-xs text-bark"
                  >
                    {vistaPrevia ? (
                      <img
                        src={vistaPrevia}
                        alt=""
                        width={80}
                        height={80}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      "Sin foto"
                    )}
                  </div>
                  <div className="min-w-0">
                    <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-mist bg-white px-4 text-sm font-semibold text-ink transition-colors hover:border-stem hover:text-stem has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-stem motion-reduce:transition-none">
                      {vistaPrevia ? "Cambiar foto" : "Elegir foto"}
                      <input
                        aria-labelledby="etiqueta-foto"
                        aria-describedby="ayuda-foto"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => elegirFoto(e.target.files?.[0])}
                        className="sr-only"
                      />
                    </label>
                    <p
                      id="ayuda-foto"
                      role={errores.foto ? "alert" : undefined}
                      className={
                        errores.foto
                          ? "mt-1.5 text-sm text-danger"
                          : "mt-1.5 truncate text-xs text-bark"
                      }
                    >
                      {errores.foto ?? (foto ? foto.name : "JPG, PNG o WebP de hasta 3 MB.")}
                    </p>
                  </div>
                </div>
              </div>

              {errorGeneral ? (
                <p
                  ref={errorRef}
                  tabIndex={-1}
                  role="alert"
                  className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger"
                >
                  {errorGeneral}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="secondary" disabled={guardando} onClick={pedirCerrar}>
                  Cancelar
                </Button>
                <Button type="submit" loading={guardando} loadingLabel="Guardando…">
                  {editando ? "Guardar cambios" : "Crear producto"}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </dialog>
  );
}

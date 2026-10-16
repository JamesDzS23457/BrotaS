import { useEffect, useState, type FormEvent } from "react";

import { ApiError } from "../../../shared/api/client";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
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

// Formulario modal para crear o editar un producto, con foto y vista previa
export default function ProductFormModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editando = product !== null;
  const [nombre, setNombre] = useState(product?.name ?? "");
  const [precio, setPrecio] = useState(product?.price ?? "");
  const [descripcion, setDescripcion] = useState(product?.description ?? "");
  const [categoria, setCategoria] = useState(product?.category_id?.toString() ?? "");
  const [minimo, setMinimo] = useState(String(product?.min_stock ?? 0));
  const [publicado, setPublicado] = useState(product?.is_published ?? false);
  const [foto, setFoto] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(product?.image_url ?? null);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Escape y categorías al abrir (el foco inicial va con autoFocus)
  useEffect(() => {
    let activo = true;
    listCategories()
      .then((lista) => {
        if (activo) setCategorias(lista.filter((c) => c.is_active));
      })
      .catch(() => {
        // Sin categorías no se bloquea el formulario
      });
    function alTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") onClose();
    }
    document.addEventListener("keydown", alTeclar);
    return () => {
      activo = false;
      document.removeEventListener("keydown", alTeclar);
    };
  }, [onClose]);

  // La vista previa vive mientras el modal está abierto
  useEffect(() => {
    return () => {
      if (vistaPrevia && vistaPrevia.startsWith("blob:")) URL.revokeObjectURL(vistaPrevia);
    };
  }, [vistaPrevia]);

  function elegirFoto(archivo: File | undefined) {
    if (!archivo) return;
    if (!TIPOS_FOTO.includes(archivo.type)) {
      setError("La foto debe ser jpg, png o webp.");
      return;
    }
    if (archivo.size > MAX_FOTO_BYTES) {
      setError("La foto no puede pasar de 3 MB.");
      return;
    }
    setError(null);
    setFoto(archivo);
    setVistaPrevia((anterior) => {
      if (anterior && anterior.startsWith("blob:")) URL.revokeObjectURL(anterior);
      return URL.createObjectURL(archivo);
    });
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setError("El nombre es obligatorio.");
      return;
    }
    const precioNumero = Number(precio.replace(",", "."));
    if (precio.trim() === "" || Number.isNaN(precioNumero) || precioNumero < 0) {
      setError("El precio debe ser un número mayor o igual a cero.");
      return;
    }
    const minimoNumero = Number(minimo);
    if (!Number.isInteger(minimoNumero) || minimoNumero < 0) {
      setError("El stock mínimo debe ser un número entero mayor o igual a cero.");
      return;
    }
    setGuardando(true);
    try {
      const datos = {
        name: nombreLimpio,
        description: descripcion.trim() || null,
        price: precioNumero.toFixed(2),
        category_id: categoria === "" ? null : Number(categoria),
        min_stock: minimoNumero,
        is_published: publicado,
      };
      const guardado = editando && product
        ? await updateProduct(product.id, datos)
        : await createProduct(datos);
      if (foto) await uploadProductImage(guardado.id, foto);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titulo-producto" className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-ink/50" aria-hidden="true" />
      <div className="absolute inset-0 overflow-y-auto">
        <div className="mx-auto my-6 w-[calc(100%-2.5rem)] max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:my-10">
          <h2 id="titulo-producto" className="font-display text-2xl font-semibold text-ink">
            {editando ? "Editar producto" : "Nuevo producto"}
          </h2>

          <form onSubmit={guardar} className="mt-5 space-y-4">
            <Input
              label="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ramo de rosas"
              maxLength={160}
              required
              autoFocus
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Precio (COP)"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="25000"
                inputMode="decimal"
                required
              />
              <Input
                label="Stock mínimo"
                value={minimo}
                onChange={(e) => setMinimo(e.target.value)}
                inputMode="numeric"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="descripcion" className="block text-sm font-medium text-ink">
                Descripción (opcional)
              </label>
              <textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
                maxLength={2000}
                className="block w-full rounded-lg border border-mist bg-white px-3 py-2.5 text-ink placeholder:text-bark/70 focus-visible:border-stem"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="categoria" className="block text-sm font-medium text-ink">
                Categoría
              </label>
              <select
                id="categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="block w-full rounded-lg border border-mist bg-white px-3 py-2.5 text-ink focus-visible:border-stem"
              >
                <option value="">Sin categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
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
                  className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-mist/40 text-xs text-bark"
                >
                  {vistaPrevia ? (
                    <img src={vistaPrevia} alt="" className="h-full w-full object-cover" />
                  ) : (
                    "Sin foto"
                  )}
                </div>
                <label
                  htmlFor="foto"
                  className="cursor-pointer rounded-lg border border-mist bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-stem hover:text-stem"
                >
                  Elegir foto
                </label>
                <input
                  id="foto"
                  aria-labelledby="etiqueta-foto"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => elegirFoto(e.target.files?.[0])}
                  className="sr-only"
                />
              </div>
              {foto ? <p className="text-sm text-bark">{foto.name}</p> : null}
            </div>

            {error ? (
              <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" loading={guardando}>
                {editando ? "Guardar cambios" : "Crear producto"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

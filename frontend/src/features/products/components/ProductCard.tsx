import { useState } from "react";

import Button from "../../../shared/components/Button";
import { formatCOP } from "../../../shared/format";
import type { Product } from "../api/products";

// Tarjeta de un producto: foto, nombre, precio, stock y acciones del dueño
export default function ProductCard({
  product,
  canManage,
  stockBusy,
  onEdit,
  onStock,
}: {
  product: Product;
  canManage: boolean;
  stockBusy: boolean;
  onEdit: (product: Product) => void;
  onStock: (product: Product, delta: 1 | -1) => void;
}) {
  const [imagenRota, setImagenRota] = useState(false);
  const pocoStock = product.stock <= product.min_stock;
  const mostrarFoto = product.image_url && !imagenRota;

  return (
    <article
      aria-label={product.name}
      className={`flex flex-col overflow-hidden rounded-xl border bg-white transition-colors ${
        pocoStock ? "border-danger/60" : "border-mist"
      }`}
    >
      <div className="relative aspect-[4/3] bg-mist/40">
        {mostrarFoto ? (
          <img
            src={product.image_url ?? undefined}
            alt={`Foto de ${product.name}`}
            loading="lazy"
            onError={() => setImagenRota(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-bark">
            Sin foto
          </div>
        )}
        {pocoStock ? (
          <span className="absolute left-2 top-2 rounded-full bg-danger px-2.5 py-1 text-xs font-semibold text-white">
            ¡Poco stock!
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h2 className="font-display text-lg font-semibold leading-snug text-ink">
          {product.name}
        </h2>
        <p className="text-lg font-bold text-ink">{formatCOP(product.price)}</p>
        <p className={`text-sm font-medium ${pocoStock ? "text-danger" : "text-bark"}`}>
          Stock: {product.stock}
          {pocoStock ? ` (mínimo ${product.min_stock})` : null}
        </p>

        {canManage ? (
          <div className="mt-3 flex items-center gap-2">
            <div
              role="group"
              aria-label={`Ajustar stock de ${product.name}`}
              className="flex items-center gap-1"
            >
              <button
                type="button"
                onClick={() => onStock(product, -1)}
                disabled={stockBusy || product.stock <= 0}
                aria-label={`Quitar 1 a ${product.name}`}
                className="rounded-lg border border-mist bg-white px-3 py-1.5 text-base font-bold text-ink transition-colors hover:border-stem hover:text-stem disabled:cursor-not-allowed disabled:opacity-40"
              >
                −1
              </button>
              <button
                type="button"
                onClick={() => onStock(product, 1)}
                disabled={stockBusy}
                aria-label={`Sumar 1 a ${product.name}`}
                className="rounded-lg border border-mist bg-white px-3 py-1.5 text-base font-bold text-ink transition-colors hover:border-stem hover:text-stem disabled:cursor-not-allowed disabled:opacity-40"
              >
                +1
              </button>
            </div>
            <Button
              variant="secondary"
              onClick={() => onEdit(product)}
              className="ml-auto px-3 py-1.5"
            >
              Editar
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

import { useState } from "react";

import Button from "../../../shared/components/Button";
import { formatCOP } from "../../../shared/format";
import type { Product } from "../api/products";
import StockBadge from "./StockBadge";
import StockControls from "./StockControls";

// Tarjeta de un producto: foto, nombre, precio, stock y acciones del dueño
export default function ProductCard({
  product,
  currency = "COP",
  categoryName,
  canManage,
  stockBusy,
  onEdit,
  onStock,
}: {
  product: Product;
  currency?: string | null;
  categoryName?: string;
  canManage: boolean;
  stockBusy: boolean;
  onEdit: (product: Product) => void;
  onStock: (product: Product, delta: 1 | -1) => void;
}) {
  const [imagenRota, setImagenRota] = useState(false);
  const pocoStock = product.stock <= product.min_stock;
  const mostrarFoto = product.image_url && !imagenRota;
  const inicial = product.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <article
      aria-label={product.name}
      className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white ${
        pocoStock ? "border-danger/50" : "border-mist"
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-mist/50">
        {mostrarFoto ? (
          <img
            src={product.image_url ?? undefined}
            alt={`Foto de ${product.name}`}
            width={400}
            height={320}
            loading="lazy"
            onError={() => setImagenRota(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center bg-[radial-gradient(120%_100%_at_20%_0%,#dcd7ec_0%,#d8e3e7_70%)] font-display text-5xl font-semibold tracking-tighter text-forest/40"
          >
            {inicial}
          </div>
        )}
        {product.is_published ? (
          <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-ink backdrop-blur">
            En el catálogo
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          {categoryName ? <p className="truncate text-xs text-bark">{categoryName}</p> : null}
          <h2 className="line-clamp-2 break-words font-display text-lg font-semibold leading-snug tracking-tight text-ink">
            {product.name}
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-xl font-semibold tabular-nums text-ink">
            {formatCOP(product.price, currency)}
          </p>
          <StockBadge product={product} />
        </div>

        {canManage ? (
          <div className="mt-auto flex items-center gap-2 border-t border-mist pt-3">
            <StockControls product={product} busy={stockBusy} onStock={onStock} />
            <Button
              variant="secondary"
              onClick={() => onEdit(product)}
              aria-label={`Editar ${product.name}`}
              className="ml-auto"
            >
              Editar
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

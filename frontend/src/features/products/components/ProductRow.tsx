import Button from "../../../shared/components/Button";
import ProductThumb from "../../../shared/components/ProductThumb";
import { formatCOP } from "../../../shared/format";
import type { Product } from "../api/products";
import StockBadge from "./StockBadge";
import StockControls from "./StockControls";

// Fila compacta de un producto para la vista de lista (catálogos grandes)
export default function ProductRow({
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
  return (
    <li
      aria-label={product.name}
      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 px-3 py-3 sm:px-4 xl:grid-cols-[auto_minmax(0,1fr)_7rem_8.5rem_auto] xl:gap-x-4"
    >
      <ProductThumb product={product} className="h-14 w-14" />

      <div className="min-w-0">
        <p className="truncate font-semibold text-ink" title={product.name}>
                  {product.name}
                </p>
        <p className="truncate text-xs text-bark">
          {categoryName ?? "Sin categoría"}
          {product.stock <= product.min_stock ? `. Mínimo: ${product.min_stock}` : ""}
        </p>
        <p className="mt-0.5 font-semibold tabular-nums text-ink xl:hidden">
          {formatCOP(product.price, currency)}
        </p>
      </div>

      <p className="hidden text-right font-semibold tabular-nums text-ink xl:block">
        {formatCOP(product.price, currency)}
      </p>

      <div className="col-start-2 xl:col-start-auto xl:justify-self-start">
        <StockBadge product={product} />
      </div>

      {canManage ? (
        <div className="col-span-2 flex items-center gap-2 xl:col-span-1 xl:col-start-auto">
          <StockControls product={product} busy={stockBusy} onStock={onStock} />
          <Button
            variant="secondary"
            onClick={() => onEdit(product)}
            aria-label={`Editar ${product.name}`}
            className="ml-auto xl:ml-1"
          >
            Editar
          </Button>
        </div>
      ) : null}
    </li>
  );
}

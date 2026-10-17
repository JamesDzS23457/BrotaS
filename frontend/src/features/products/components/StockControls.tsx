import type { Product } from "../api/products";

const BOTON =
  "flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-mist bg-white text-base font-bold tabular-nums text-ink transition-colors hover:border-stem hover:text-stem active:bg-paper aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:border-mist aria-disabled:hover:text-ink motion-reduce:transition-none";

// Ajuste rápido de stock: quitar o sumar una unidad.
// Se usa aria-disabled (no disabled) para que el foco no se pierda mientras se guarda
// o cuando el stock llega a cero, y se pueda seguir sumando con el teclado.
export default function StockControls({
  product,
  busy,
  onStock,
}: {
  product: Product;
  busy: boolean;
  onStock: (product: Product, delta: 1 | -1) => void;
}) {
  const sinStock = product.stock <= 0;

  return (
    <div role="group" aria-label={`Ajustar stock de ${product.name}`} className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => {
          if (!busy && !sinStock) onStock(product, -1);
        }}
        aria-disabled={busy || sinStock}
        aria-label={`Quitar 1 a ${product.name}`}
        className={BOTON}
      >
        −1
      </button>
      <button
        type="button"
        onClick={() => {
          if (!busy) onStock(product, 1);
        }}
        aria-disabled={busy}
        aria-label={`Sumar 1 a ${product.name}`}
        className={BOTON}
      >
        +1
      </button>
    </div>
  );
}

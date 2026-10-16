import Button from "../../../shared/components/Button";
import { formatCOP } from "../../../shared/format";
import type { Product } from "../../products/api/products";
import { PAYMENT_METHODS, type PaymentMethod } from "../api/sales";

export interface CartLine {
  product: Product;
  quantity: number;
}

// Carrito: líneas con cantidades, total, método de pago y confirmar
export default function CartPanel({
  lines,
  payment,
  saving,
  currency = "COP",
  onQuantity,
  onRemove,
  onPayment,
  onConfirm,
}: {
  lines: CartLine[];
  payment: PaymentMethod;
  saving: boolean;
  currency?: string | null;
  onQuantity: (productId: number, quantity: number) => void;
  onRemove: (productId: number) => void;
  onPayment: (payment: PaymentMethod) => void;
  onConfirm: () => void;
}) {
  const total = lines.reduce((suma, linea) => suma + Number(linea.product.price) * linea.quantity, 0);

  return (
    <section aria-labelledby="titulo-carrito" className="rounded-xl border border-mist bg-white p-5">
      <h2 id="titulo-carrito" className="font-display text-xl font-semibold text-ink">
        Carrito
      </h2>

      {lines.length === 0 ? (
        <p className="mt-3 text-sm text-bark">
          Vacío por ahora. Busca arriba y agrega productos.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-mist">
          {lines.map((linea) => (
            <li key={linea.product.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{linea.product.name}</p>
                <p className="text-xs text-bark">{formatCOP(linea.product.price, currency)} c/u</p>
              </div>
              <div role="group" aria-label={`Cantidad de ${linea.product.name}`} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => (linea.quantity <= 1 ? onRemove(linea.product.id) : onQuantity(linea.product.id, linea.quantity - 1))}
                  disabled={saving}
                  aria-label={`Quitar uno de ${linea.product.name}`}
                  className="rounded-lg border border-mist px-2.5 py-1 font-bold text-ink hover:border-stem hover:text-stem disabled:opacity-40"
                >
                  −
                </button>
                <span aria-live="polite" className="w-7 text-center text-sm font-bold tabular-nums text-ink">
                  {linea.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onQuantity(linea.product.id, Math.min(linea.quantity + 1, linea.product.stock))}
                  disabled={saving || linea.quantity >= linea.product.stock}
                  title={linea.quantity >= linea.product.stock ? `Solo hay ${linea.product.stock}` : undefined}
                  aria-label={`Agregar uno de ${linea.product.name}`}
                  className="rounded-lg border border-mist px-2.5 py-1 font-bold text-ink hover:border-stem hover:text-stem disabled:opacity-40"
                >
                  +
                </button>
              </div>
              <p className="w-20 text-right text-sm font-bold tabular-nums text-ink">
                {formatCOP(Number(linea.product.price) * linea.quantity, currency)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-baseline justify-between border-t border-mist pt-4">
        <span className="text-sm font-medium text-bark">Total</span>
        <span aria-live="polite" className="font-display text-2xl font-bold text-ink">
          {formatCOP(total, currency)}
        </span>
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-ink">Método de pago</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((metodo) => (
            <label
              key={metodo.value}
              className={`cursor-pointer rounded-lg border px-2 py-2.5 text-center text-sm font-semibold transition-colors ${
                payment === metodo.value
                  ? "border-stem bg-stem text-white"
                  : "border-mist bg-white text-ink hover:border-stem"
              }`}
            >
              <input
                type="radio"
                name="metodo-pago"
                value={metodo.value}
                checked={payment === metodo.value}
                onChange={() => onPayment(metodo.value)}
                disabled={saving || lines.length === 0}
                className="sr-only"
              />
              {metodo.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Button
        onClick={onConfirm}
        loading={saving}
        disabled={lines.length === 0}
        className="mt-4 w-full"
      >
        Confirmar venta
      </Button>
    </section>
  );
}

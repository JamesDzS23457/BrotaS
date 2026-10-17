import Button from "../../../shared/components/Button";
import ProductThumb from "../../../shared/components/ProductThumb";
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
  error = null,
  onQuantity,
  onRemove,
  onPayment,
  onConfirm,
}: {
  lines: CartLine[];
  payment: PaymentMethod;
  saving: boolean;
  currency?: string | null;
  error?: string | null;
  onQuantity: (productId: number, quantity: number) => void;
  onRemove: (productId: number) => void;
  onPayment: (payment: PaymentMethod) => void;
  onConfirm: () => void;
}) {
  const total = lines.reduce((suma, linea) => suma + Number(linea.product.price) * linea.quantity, 0);
  const unidades = lines.reduce((suma, linea) => suma + linea.quantity, 0);
  const vacio = lines.length === 0;

  return (
    <section
      id="carrito"
      aria-labelledby="titulo-carrito"
      className="scroll-mt-24 rounded-2xl border border-mist bg-white p-4 sm:p-5 lg:sticky lg:top-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-carrito" className="flex min-w-0 items-center gap-3 font-display text-xl font-semibold tracking-tighter text-ink">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest text-sm font-bold tabular-nums text-white"
          >
            2
          </span>
          <span className="sr-only">Paso 2: </span>
          <span className="truncate">Cobra</span>
        </h2>
        <p className="shrink-0 text-sm tabular-nums text-bark">
          {vacio ? "Carrito vacío" : `${unidades} ${unidades === 1 ? "producto" : "productos"}`}
        </p>
      </div>

      {vacio ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-mist bg-paper/60 p-4">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-stem"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.76L19.5 8H6.2" />
              <circle cx="9.5" cy="19" r="1.25" />
              <circle cx="17" cy="19" r="1.25" />
            </svg>
          </span>
          <p className="min-w-0 text-sm text-bark">
            <span className="block font-semibold text-ink">Aún no hay productos</span>
            Agrega productos de la lista para armar la venta.
          </p>
        </div>
      ) : (
        <ul aria-label="Productos del carrito" className="-mx-1 mt-3 divide-y divide-mist px-1 lg:max-h-[min(26rem,45svh)] lg:overflow-y-auto">
          {lines.map((linea) => {
            const enTope = linea.quantity >= linea.product.stock;
            return (
              <li key={linea.product.id} className="pop-in py-3">
                <div className="flex items-center gap-3">
                  <ProductThumb product={linea.product} className="h-10 w-10 text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 break-words text-sm font-semibold text-ink">{linea.product.name}</p>
                    <p className="truncate text-xs tabular-nums text-bark">
                      {formatCOP(linea.product.price, currency)} c/u
                      {enTope ? ". Máximo disponible" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(linea.product.id)}
                    disabled={saving}
                    aria-label={`Quitar ${linea.product.name} del carrito`}
                    className="min-h-11 min-w-11 shrink-0 rounded-xl px-2 text-xs font-semibold text-bark transition-colors hover:text-danger disabled:opacity-40"
                  >
                    Quitar
                  </button>
                </div>

                <div className="mt-1 flex items-center justify-between gap-3">
                  <div role="group" aria-label={`Cantidad de ${linea.product.name}`} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => (linea.quantity <= 1 ? onRemove(linea.product.id) : onQuantity(linea.product.id, linea.quantity - 1))}
                      disabled={saving}
                      aria-label={`Quitar uno de ${linea.product.name}`}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-mist text-lg font-bold text-ink transition-colors hover:border-stem hover:text-stem disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="min-w-9 px-1 text-center text-base font-bold tabular-nums text-ink">
                      {linea.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onQuantity(linea.product.id, Math.min(linea.quantity + 1, linea.product.stock))}
                      disabled={saving || enTope}
                      title={enTope ? `Solo hay ${linea.product.stock}` : undefined}
                      aria-label={`Agregar uno de ${linea.product.name}`}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-mist text-lg font-bold text-ink transition-colors hover:border-stem hover:text-stem disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <p className="min-w-0 truncate text-right text-sm font-bold tabular-nums text-ink">
                    {formatCOP(Number(linea.product.price) * linea.quantity, currency)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-mist pt-4">
        <span className="text-sm font-medium text-bark">Total</span>
        <span
          id="total-venta"
          className="min-w-0 truncate font-display text-3xl font-bold tracking-tighter tabular-nums text-ink"
        >
          {formatCOP(total, currency)}
        </span>
      </div>

      <fieldset className="mt-4 min-w-0">
        <legend className="text-sm font-medium text-ink">Método de pago</legend>
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl border border-mist bg-paper p-1">
          {PAYMENT_METHODS.map((metodo) => (
            <label
              key={metodo.value}
              className={`flex min-h-11 min-w-0 cursor-pointer items-center justify-center rounded-lg px-1 text-center text-xs font-semibold break-words transition-colors has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-stem sm:text-sm ${
                payment === metodo.value ? "bg-forest text-white" : "text-ink hover:bg-white"
              }`}
            >
              <input
                type="radio"
                name="metodo-pago"
                value={metodo.value}
                checked={payment === metodo.value}
                onChange={() => onPayment(metodo.value)}
                disabled={saving || vacio}
                className="sr-only"
              />
              {metodo.label}
            </label>
          ))}
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Button
        onClick={onConfirm}
        loading={saving}
        disabled={vacio}
        aria-describedby="total-venta"
        className="mt-4 min-h-12 w-full"
      >
        Confirmar venta
        <span aria-hidden="true" className="font-normal tabular-nums opacity-80">
          · {formatCOP(total, currency)}
        </span>
      </Button>
    </section>
  );
}

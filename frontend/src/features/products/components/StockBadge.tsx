import { textoQuedan } from "../../../shared/format";
import type { Product } from "../api/products";

// Estado del stock en texto (no solo color): Agotado, Quedan N o N disponibles
export default function StockBadge({ product }: { product: Pick<Product, "stock" | "min_stock"> }) {
  const agotado = product.stock <= 0;
  const bajo = !agotado && product.stock <= product.min_stock;
  const texto = agotado
    ? "Agotado"
    : bajo
      ? textoQuedan(product.stock)
      : `${product.stock} ${product.stock === 1 ? "disponible" : "disponibles"}`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
        agotado || bajo
          ? "bg-danger-soft text-danger"
          : "border border-mist bg-paper text-bark"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${agotado || bajo ? "bg-danger" : "bg-vine"}`}
      />
      {texto}
    </span>
  );
}

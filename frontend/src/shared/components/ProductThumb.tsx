import { useState } from "react";

// Miniatura del producto: foto decorativa (el nombre va al lado) o, si no hay o falla, la inicial
export default function ProductThumb({
  product,
  className = "h-12 w-12",
}: {
  product: { name: string; image_url: string | null };
  className?: string;
}) {
  const [imagenRota, setImagenRota] = useState(false);
  const inicial = product.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-mist font-display font-semibold text-bark ${className}`}
    >
      {product.image_url && !imagenRota ? (
        <img
          src={product.image_url}
          alt=""
          loading="lazy"
          onError={() => setImagenRota(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        inicial
      )}
    </span>
  );
}

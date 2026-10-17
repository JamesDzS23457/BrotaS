import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  // Texto mientras carga: debe decir qué se está haciendo («Guardando…», «Entrando…»)
  loadingLabel?: string;
  variant?: ButtonVariant;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-stem text-white shadow-[0_3px_0_0_rgb(32_52_61_/_0.1)] hover:-translate-y-px hover:bg-stem-strong active:translate-y-0 active:shadow-none",
  secondary: "border border-mist bg-white text-ink hover:border-stem hover:text-stem",
  quiet: "text-bark hover:text-ink",
};

// Botón común de la aplicación
export default function Button({
  loading = false,
  loadingLabel = "Procesando…",
  disabled,
  variant = "primary",
  type = "button",
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-[background-color,border-color,color,transform,box-shadow] duration-150 motion-reduce:transition-none motion-reduce:hover:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_STYLES[variant]} ${className}`}
    >
      {loading && (
        <svg aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
          <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
      {loading ? loadingLabel : children}
    </button>
  );
}

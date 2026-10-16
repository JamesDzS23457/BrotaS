import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: ButtonVariant;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-stem text-white hover:bg-stem-strong",
  secondary: "border border-mist bg-white text-ink hover:border-stem hover:text-stem",
  quiet: "text-bark hover:text-ink",
};

// Botón común de la aplicación
export default function Button({
  loading = false,
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
      aria-live="polite"
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_STYLES[variant]} ${className}`}
    >
      {loading ? "Procesando…" : children}
    </button>
  );
}

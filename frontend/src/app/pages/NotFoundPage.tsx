import { Link } from "react-router-dom";

import LogoMark from "../../shared/components/LogoMark";

// Página para rutas inexistentes
export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
      <LogoMark className="h-11 w-11" />
      <h1 className="font-display text-3xl font-semibold text-ink">
        No encontramos esta página
      </h1>
      <p className="max-w-sm text-bark">
        Puede que el enlace esté roto o que la página se haya movido.
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex items-center justify-center rounded-lg bg-stem px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-stem-strong"
      >
        Volver al inicio
      </Link>
    </div>
  );
}

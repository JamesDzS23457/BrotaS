import { Link } from "react-router-dom";

import LogoMark from "../../shared/components/LogoMark";

// Página para rutas inexistentes
export default function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-mist bg-white">
        <LogoMark className="h-8 w-8" />
      </span>
      <h1 className="font-display text-3xl font-semibold tracking-tighter text-ink sm:text-4xl">
        No encontramos esta página
      </h1>
      <p className="max-w-sm text-bark">
        Puede que el enlace esté roto o que la página se haya movido. Vuelve al inicio para seguir.
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-stem px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-stem-strong motion-reduce:transition-none"
      >
        Volver al inicio
      </Link>
    </main>
  );
}

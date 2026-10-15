import { Link } from "react-router-dom";

// Página para rutas inexistentes
export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100">
      <h1 className="text-2xl font-semibold text-slate-800">Página no encontrada</h1>
      <Link className="text-sm text-emerald-700 hover:underline" to="/">
        Volver al inicio
      </Link>
    </div>
  );
}

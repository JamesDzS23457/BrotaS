import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import LogoMark from "../../../shared/components/LogoMark";
import Bouquet from "../../../shared/components/Bouquet";
import { ApiError } from "../../../shared/api/client";
import { PLATFORM_NAME } from "../../../shared/config";
import { useAuth } from "../hooks/useAuth";

// Pantalla de inicio de sesión
export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const destino =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-forest lg:grid lg:grid-cols-[minmax(0,1fr)_26rem]">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      {/* Panel de marca */}
      <section className="scene relative overflow-hidden px-6 pt-8 pb-48 sm:px-10 lg:flex lg:flex-col lg:px-14 lg:py-12">
        <div className="relative z-10 flex items-center gap-2.5 text-paper">
          <LogoMark className="h-9 w-9" />
          <p className="font-display text-2xl font-semibold tracking-tight">{PLATFORM_NAME}</p>
        </div>

        <p className="relative z-10 mt-8 max-w-sm font-display text-[1.7rem] leading-[1.15] text-paper sm:text-3xl lg:mt-20 lg:max-w-md lg:text-4xl">
          El inventario y las ventas de tu floristería, ordenados en un solo lugar.
        </p>

        <Bouquet className="pointer-events-none absolute inset-x-0 bottom-0 h-48 w-full sm:h-60 lg:h-[64%]" />
      </section>

      {/* Formulario */}
      <main
        id="contenido"
        className="flex items-center justify-center bg-paper px-6 py-14 sm:px-10 lg:py-16"
      >
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl font-semibold text-ink">Inicia sesión</h1>
          <p className="mt-2 text-sm text-bark">
            Entra con tu correo y tu contraseña para ver tu local.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Input
              label="Correo"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              placeholder="nombre@tulocal.co"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Contraseña"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
              >
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Entrar
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}

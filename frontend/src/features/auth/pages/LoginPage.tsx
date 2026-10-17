import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import Button from "../../../shared/components/Button";
import Icon from "../../../shared/components/Icon";
import { ICON_PATHS } from "../../../shared/components/icon-paths";
import Input from "../../../shared/components/Input";
import LogoMark from "../../../shared/components/LogoMark";
import heroPhoto from "../../../assets/hero-floristeria-1200.webp";
import heroPhotoLarge from "../../../assets/hero-floristeria-2000.webp";
import heroPhotoSmall from "../../../assets/hero-floristeria-700.webp";
import { ApiError } from "../../../shared/api/client";
import { PLATFORM_NAME } from "../../../shared/config";
import { useAuth } from "../hooks/useAuth";

// Herramientas del panel, con los mismos íconos de la navegación
const CAPACIDADES = [
  { texto: "Inventario", icono: ICON_PATHS.productos },
  { texto: "Ventas", icono: ICON_PATHS.ventas },
  { texto: "Reportes", icono: ICON_PATHS.reporte },
] as const;

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const shellRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const destination =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  // La foto y las fichas se desplazan un poco con el puntero (solo ratón y con movimiento permitido)
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const puntero = window.matchMedia("(hover: hover) and (pointer: fine)");
    const calma = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cuadro = 0;

    function alMover(evento: PointerEvent) {
      if (!puntero.matches || calma.matches || !shell) return;
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => {
        const caja = shell.getBoundingClientRect();
        shell.style.setProperty("--px", ((evento.clientX - caja.left) / caja.width - 0.5).toFixed(3));
        shell.style.setProperty("--py", ((evento.clientY - caja.top) / caja.height - 0.5).toFixed(3));
      });
    }

    shell.addEventListener("pointermove", alMover);
    return () => {
      cancelAnimationFrame(cuadro);
      shell.removeEventListener("pointermove", alMover);
    };
  }, []);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function revisarMayusculas(evento: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(evento.getModifierState("CapsLock"));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo conectar. Revisa tu conexión e intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={shellRef} className="login-shell">
      <a className="skip-link" href="#contenido">Saltar al contenido</a>

      <img
        src={heroPhoto}
        srcSet={`${heroPhotoSmall} 700w, ${heroPhoto} 1200w, ${heroPhotoLarge} 2000w`}
        sizes="100vw"
        width={1200}
        height={800}
        alt=""
        decoding="async"
        fetchPriority="high"
        className="login-photo"
      />
      <div className="login-photo-shade" aria-hidden="true" />

      <section className="login-story" aria-label="Tu floristería, más simple">
        <div className="login-brand">
          <span className="login-brand-mark"><LogoMark className="h-7 w-7" /></span>
          <span translate="no" className="font-display text-xl font-semibold tracking-[-0.06em]">
            {PLATFORM_NAME}
          </span>
        </div>

        {/* Vista de ejemplo del panel: da contexto sin inventar datos del local */}
        <div className="login-chips" aria-hidden="true">
          <span className="login-chip-note">Vista de ejemplo</span>
          <div className="login-chip login-chip-a">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[radial-gradient(120%_100%_at_20%_0%,#e7afc2_0%,#dcd7ec_80%)] font-display font-semibold text-forest">
              R
            </span>
            <span>
              <span className="block text-sm font-semibold">Ramo de temporada</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-bark">
                <span className="login-dot h-1.5 w-1.5 rounded-full bg-vine" />
                12 disponibles
              </span>
            </span>
          </div>
          <div className="login-chip login-chip-b">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-soft text-danger">
              <Icon d={ICON_PATHS.alerta} className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Peonías</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-danger">
                <span className="login-dot h-1.5 w-1.5 rounded-full bg-danger" />
                Quedan 3
              </span>
            </span>
          </div>
        </div>

        <div>
          <p className="login-headline">
            <span className="login-line"><span className="login-line-inner" style={{ "--i": 0 } as CSSProperties}>Más flores.</span></span>
            <span className="login-line"><span className="login-line-inner" style={{ "--i": 1 } as CSSProperties}>Menos enredos.</span></span>
          </p>
          <p className="login-lead">
            Cuida lo que creas. El inventario y las ventas encuentran su lugar aquí.
          </p>
          <ul className="login-capabilities" aria-label="Herramientas para tu local">
            {CAPACIDADES.map((capacidad) => (
              <li key={capacidad.texto}>
                <Icon d={capacidad.icono} className="h-4 w-4" />
                {capacidad.texto}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <main id="contenido" tabIndex={-1} className="login-panel">
        <div className="login-form-content">
          <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-tighter text-ink sm:text-[2.5rem]">
            Tu local, a tu ritmo.
          </h1>
          <p className="mt-3 max-w-xs text-[0.95rem] leading-relaxed text-bark">
            Inicia sesión para seguir con lo que haces florecer.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" aria-label="Iniciar sesión">
            <Input
              label="Correo electrónico"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              placeholder="nombre@tulocal.co…"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <div>
              <div className="relative">
                <Input
                  id="login-password"
                  label="Contraseña"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={revisarMayusculas}
                  onKeyUp={revisarMayusculas}
                  onBlur={() => setCapsLock(false)}
                  className="pr-14"
                />
                <button
                  type="button"
                  className="absolute bottom-0.5 right-0.5 flex h-11 w-11 items-center justify-center rounded-[0.65rem] text-bark transition-colors hover:bg-paper hover:text-ink motion-reduce:transition-none"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-controls="login-password"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  <Icon
                    d={showPassword ? ICON_PATHS.ojoCerrado : ICON_PATHS.ojo}
                    className="h-5 w-5"
                    strokeWidth={1.6}
                  />
                </button>
              </div>
              <p aria-live="polite" className="mt-2 min-h-0 text-xs text-bark">
                {capsLock ? (
                  <span className="pop-in inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 font-medium text-ink">
                    <Icon d={ICON_PATHS.alerta} className="h-3.5 w-3.5 text-bloom" />
                    Bloq Mayús está activado.
                  </span>
                ) : null}
              </p>
            </div>

            {error && (
              <p
                ref={errorRef}
                tabIndex={-1}
                role="alert"
                className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-danger"
              >
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} loadingLabel="Entrando…" className="min-h-12 w-full">
              Entrar a mi local
            </Button>
          </form>

          <p className="mt-7 flex items-start gap-2 text-xs leading-relaxed text-[#3d525c]">
            <Icon d={ICON_PATHS.candado} className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
            Usa el acceso que te dio la persona encargada de tu local.
          </p>
        </div>

        <footer className="login-footer">
          <span translate="no">{PLATFORM_NAME}</span>
          <span>Más espacio para crear.</span>
        </footer>
      </main>
    </div>
  );
}

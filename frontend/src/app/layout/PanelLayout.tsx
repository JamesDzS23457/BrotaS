import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../features/auth/hooks/useAuth";
import Icono from "../../shared/components/Icon";
import { ICON_PATHS as ICONOS } from "../../shared/components/icon-paths";
import LogoMark from "../../shared/components/LogoMark";
import { PLATFORM_NAME } from "../../shared/config";

interface Opcion {
  ruta: string;
  etiqueta: string;
  icono: "productos" | "ventas" | "reporte";
  roles: string[];
}

// El reporte trae la plata del día: solo el dueño lo ve
const OPCIONES: Opcion[] = [
  { ruta: "/productos", etiqueta: "Productos", icono: "productos", roles: ["owner", "staff"] },
  { ruta: "/ventas", etiqueta: "Ventas", icono: "ventas", roles: ["owner", "staff"] },
  { ruta: "/reporte", etiqueta: "Reporte", icono: "reporte", roles: ["owner"] },
];

const TITULOS: Record<string, string> = {
  "/productos": "Productos",
  "/ventas": "Nueva venta",
  "/reporte": "Reporte del día",
};

// Panel del local: en celular es cabecera + cajón lateral; en escritorio, barra fija
export default function PanelLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [cajon, setCajon] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const primeraRuta = useRef(true);
  const rol = user?.role ?? "";
  const opciones = OPCIONES.filter((opcion) => opcion.roles.includes(rol));

  function salir() {
    setCajon(false);
    logout();
    navigate("/login", { replace: true });
  }

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!cajon || !drawer) return;

    const desktop = window.matchMedia("(min-width: 64rem)");
    const previousOverflow = document.body.style.overflow;
    const main = mainRef.current;
    const openButton = openButtonRef.current;
    drawer.showModal();
    closeButtonRef.current?.focus();
    document.body.style.overflow = "hidden";

    function handleResize(event: MediaQueryListEvent) {
      if (event.matches) setCajon(false);
    }

    desktop.addEventListener("change", handleResize);
    return () => {
      desktop.removeEventListener("change", handleResize);
      drawer.close();
      document.body.style.overflow = previousOverflow;
      // En escritorio el disparador está oculto: el foco vuelve al contenido.
      const focusTarget = desktop.matches ? main : openButton;
      focusTarget?.focus({ preventScroll: true });
    };
  }, [cajon]);

  // Al cambiar de sección se actualiza el título de la pestaña y el foco pasa al contenido
  useEffect(() => {
    document.title = `${TITULOS[location.pathname] ?? "Panel"} — ${PLATFORM_NAME}`;
    if (primeraRuta.current) {
      primeraRuta.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  const enlaces = (alElegir?: () => void) => (
    <nav aria-label="Secciones del panel">
      <ul className="space-y-2">
        {opciones.map((opcion) => (
          <li key={opcion.ruta}>
            <NavLink
              to={opcion.ruta}
              onClick={alElegir}
              className={({ isActive }) =>
                `flex min-h-12 items-center gap-3 rounded-xl border px-3.5 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stem motion-reduce:transition-none ${
                  isActive
                    ? "border-forest bg-forest text-paper"
                    : "border-transparent text-bark hover:border-mist hover:bg-paper hover:text-ink"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icono d={ICONOS[opcion.icono]} />
                  <span className="flex-1">{opcion.etiqueta}</span>
                  {isActive && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-paper/80" />}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );

  const marca = (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-mist bg-paper text-forest">
        <LogoMark className="h-7 w-7" />
      </span>
      <span translate="no" className="min-w-0 truncate font-display text-xl font-semibold tracking-tight text-ink">{PLATFORM_NAME}</span>
    </div>
  );

  const workspace = (
    <div className="mb-5 border-b border-mist pb-5">
      <p className="text-xs text-bark">Tu espacio de trabajo</p>
      <p className="mt-2 flex items-center gap-2 font-display text-sm font-semibold text-ink">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-bloom" />
        Florería
      </p>
    </div>
  );

  const account = (
    <div className="mt-8 border-t border-mist pt-5">
      <p className="px-3.5 text-xs text-bark">Sesión iniciada</p>
      <p className="mt-1 truncate px-3.5 text-sm font-medium text-ink" title={user?.email ?? undefined}>
        {user?.email ?? "Tu cuenta"}
      </p>
      <button
        type="button"
        onClick={salir}
        className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-bark transition-colors hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stem motion-reduce:transition-none"
      >
        <Icono d={ICONOS.salir} />
        Cerrar sesión
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper font-sans text-ink lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      {/* Cabecera solo en celular */}
      <header className="sticky top-0 z-30 border-b border-mist bg-paper/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          {marca}
          <button
            ref={openButtonRef}
            type="button"
            onClick={() => setCajon(true)}
            aria-expanded={cajon}
            aria-haspopup="dialog"
            aria-controls="cajon-panel"
            aria-label="Abrir menú"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-mist text-ink hover:bg-mist/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stem"
          >
            <Icono d={ICONOS.menu} className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Barra lateral fija solo en escritorio */}
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r border-mist bg-white px-5 py-7 lg:flex">
        <div className="px-1">{marca}</div>
        <div className="mt-10 flex-1">
          {workspace}
          {enlaces()}
        </div>
        {account}
      </aside>

      {/* El dialog nativo mantiene el foco dentro e inhabilita el fondo. */}
      <dialog
        ref={drawerRef}
        id="cajon-panel"
        aria-label="Menú del panel"
        aria-modal="true"
        onCancel={(event) => {
          event.preventDefault();
          setCajon(false);
        }}
        onClose={() => setCajon(false)}
        className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0 text-ink backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label="Cerrar menú"
          onClick={() => setCajon(false)}
          className="absolute inset-0 h-full w-full cursor-default border-0 bg-transparent p-0"
        />
        <div className="relative flex h-full w-80 max-w-[88vw] flex-col overflow-y-auto overscroll-contain border-r border-mist bg-white px-5 py-6 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            {marca}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setCajon(false)}
              aria-label="Cerrar menú"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stem"
            >
              <Icono d={ICONOS.cerrar} className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-9 flex-1">
            {workspace}
            {enlaces(() => setCajon(false))}
          </div>
          {account}
        </div>
      </dialog>

      <main ref={mainRef} id="contenido" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-6xl px-5 py-8 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-stem sm:px-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}

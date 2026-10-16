import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../../features/auth/hooks/useAuth";
import LogoMark from "../../shared/components/LogoMark";
import { PLATFORM_NAME } from "../../shared/config";

// Iconos propios en trazo (sin dependencias): paquete, carrito, barras, salir, menú y equis
function Icono({ d, className = "h-5 w-5" }: { d: string | readonly string[]; className?: string }) {
  const trazos = Array.isArray(d) ? d : [d];
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {trazos.map((trazo) => (
        <path key={trazo} d={trazo} />
      ))}
    </svg>
  );
}

const ICONOS = {
  productos: [
    "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",
    "m3.3 7 8.7 5 8.7-5",
    "M12 22V12",
  ],
  ventas: [
    "M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",
    "M8 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
    "M19 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  ],
  reporte: ["M3 3v16a2 2 0 0 0 2 2h16", "M7 13v4", "M12 9v8", "M17 5v12"],
  salir: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "m16 17 5-5-5-5", "M21 12H9"],
  menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
  cerrar: ["M6 6l12 12", "M18 6 6 18"],
} as const;

interface Opcion {
  ruta: string;
  etiqueta: string;
  icono: keyof typeof ICONOS;
  roles: string[];
}

// El reporte trae la plata del día: solo el dueño lo ve
const OPCIONES: Opcion[] = [
  { ruta: "/productos", etiqueta: "Productos", icono: "productos", roles: ["owner", "staff"] },
  { ruta: "/ventas", etiqueta: "Ventas", icono: "ventas", roles: ["owner", "staff"] },
  { ruta: "/reporte", etiqueta: "Reporte", icono: "reporte", roles: ["owner"] },
];

// Panel del local: en celular es cabecera + cajón lateral; en escritorio, barra fija
export default function PanelLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [cajon, setCajon] = useState(false);
  const botonCerrar = useRef<HTMLButtonElement>(null);
  const rol = user?.role ?? "";
  const opciones = OPCIONES.filter((opcion) => opcion.roles.includes(rol));

  function salir() {
    setCajon(false);
    logout();
    navigate("/login", { replace: true });
  }

  // Escape cierra el cajón y al abrirlo el foco cae en el botón de cerrar
  useEffect(() => {
    if (!cajon) return;
    botonCerrar.current?.focus();
    document.body.style.overflow = "hidden";
    function alTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") setCajon(false);
    }
    document.addEventListener("keydown", alTeclar);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", alTeclar);
    };
  }, [cajon]);

  const enlaces = (alElegir?: () => void) => (
    <nav aria-label="Secciones del panel">
      <ul className="space-y-1">
        {opciones.map((opcion) => (
          <li key={opcion.ruta}>
            <NavLink
              to={opcion.ruta}
              onClick={alElegir}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.95rem] font-medium transition-colors ${
                  isActive
                    ? "bg-forest text-paper"
                    : "text-ink hover:bg-mist/60"
                }`
              }
            >
              {({ isActive }) => (
                <span aria-current={isActive ? "page" : undefined} className="contents">
                  <Icono d={[...ICONOS[opcion.icono]]} />
                  {opcion.etiqueta}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );

  const marca = (
    <div className="flex items-center gap-2.5">
      <LogoMark className="h-7 w-7" />
      <span className="font-display text-lg font-semibold text-ink">{PLATFORM_NAME}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      {/* Cabecera solo en celular */}
      <header className="sticky top-0 z-30 border-b border-mist bg-white/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-3.5">
          {marca}
          <button
            type="button"
            onClick={() => setCajon(true)}
            aria-expanded={cajon}
            aria-controls="cajon-panel"
            aria-label="Abrir menú"
            className="rounded-lg p-2 text-ink hover:bg-mist/60"
          >
            <Icono d={ICONOS.menu} className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Barra lateral fija solo en escritorio */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-mist bg-white px-4 py-6 lg:flex">
        <div className="px-2">{marca}</div>
        <div className="mt-8 flex-1">{enlaces()}</div>
        <button
          type="button"
          onClick={salir}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[0.95rem] font-medium text-danger hover:bg-danger-soft"
        >
          <Icono d={[...ICONOS.salir]} />
          Salir
        </button>
      </aside>

      {/* Cajón lateral solo en celular */}
      <div
        className={cajon ? "lg:hidden" : "pointer-events-none lg:hidden"}
        aria-hidden={!cajon}
      >
        <div
          onClick={() => setCajon(false)}
          className={`fixed inset-0 z-40 bg-ink/50 transition-opacity ${
            cajon ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          id="cajon-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Menú del panel"
          className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white px-4 py-6 shadow-xl transition-transform ${
            cajon ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-2">
            {marca}
            <button
              ref={botonCerrar}
              type="button"
              onClick={() => setCajon(false)}
              aria-label="Cerrar menú"
              className="rounded-lg p-2 text-ink hover:bg-mist/60"
            >
              <Icono d={ICONOS.cerrar} className="h-6 w-6" />
            </button>
          </div>
          <div className="mt-8 flex-1">{enlaces(() => setCajon(false))}</div>
          <button
            type="button"
            onClick={salir}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[0.95rem] font-medium text-danger hover:bg-danger-soft"
          >
            <Icono d={[...ICONOS.salir]} />
            Salir
          </button>
        </div>
      </div>

      <main id="contenido" className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";

// Aviso breve que confirma una acción y puede ofrecer deshacerla.
// La región vive siempre montada: así los lectores de pantalla anuncian cada mensaje nuevo.
// El temporizador se detiene mientras el puntero o el foco están sobre el aviso.
export default function Toast({
  message,
  actionLabel,
  onAction,
  onDismiss,
  duration = 8000,
}: {
  message: string | null;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  duration?: number;
}) {
  const [pausado, setPausado] = useState(false);

  // El cierre se guarda en una referencia: así el temporizador no se reinicia en cada render
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!message || pausado) return;
    const timer = setTimeout(() => dismissRef.current(), duration);
    return () => clearTimeout(timer);
  }, [message, pausado, duration]);

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      {message ? (
        <div
          key={message}
          onMouseEnter={() => setPausado(true)}
          onMouseLeave={() => setPausado(false)}
          onFocus={() => setPausado(true)}
          onBlur={() => setPausado(false)}
          className="toast-in pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl bg-ink py-1.5 pl-4 pr-1.5 text-sm text-white shadow-[0_12px_32px_-8px_rgb(32_52_61_/_0.5)]"
        >
          <span className="min-w-0 flex-1 py-1.5">{message}</span>
          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="min-h-11 shrink-0 rounded-xl px-3 font-semibold text-[#dcd7ec] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {actionLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Cerrar aviso"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}

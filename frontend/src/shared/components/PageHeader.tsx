import type { ReactNode } from "react";

// Cabecera de cada pantalla del panel: título, texto de apoyo y la acción principal.
// Si el texto de apoyo cambia con los datos (p. ej. «12 productos»), quien lo pasa decide
// si se anuncia envolviéndolo en un role="status".
export default function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-semibold tracking-tighter text-ink sm:text-4xl">
          {title}
        </h1>
        {description ? <p className="mt-1.5 max-w-prose text-sm text-bark">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}

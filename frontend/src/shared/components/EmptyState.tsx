import type { ReactNode } from "react";

// Pantalla vacía: explica qué pasa y qué hacer a continuación
export default function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-mist bg-white/70 px-6 py-12 text-center">
      {icon ? (
        <span
          aria-hidden="true"
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-paper text-stem"
        >
          {icon}
        </span>
      ) : null}
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1.5 max-w-sm text-sm text-bark">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

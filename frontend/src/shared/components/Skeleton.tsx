// Bloque de carga: marca el lugar del contenido que viene. Decorativo para lectores de pantalla.
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

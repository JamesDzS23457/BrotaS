// Ícono de trazo, decorativo (el texto o el aria-label del control lo describe)
export default function Icon({
  d,
  className = "h-5 w-5",
  strokeWidth = 1.8,
}: {
  d: string | readonly string[];
  className?: string;
  strokeWidth?: number;
}) {
  const trazos = typeof d === "string" ? [d] : d;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
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

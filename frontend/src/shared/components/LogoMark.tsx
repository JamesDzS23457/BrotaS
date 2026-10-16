// Marca de Brota: un tallo con dos hojas y un pimpollo. Decorativa.
export default function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <path d="M16 29V12" stroke="#37906a" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M16 21c-4.8 0-7.6-2.3-8.2-6.6 4.8-.6 7.6 1.5 8.2 6.6Z" fill="#2b7a58" />
      <path d="M16 24.5c4.8 0 7.6-2.3 8.2-6.6-4.8-.6-7.6 1.5-8.2 6.6Z" fill="#37906a" />
      <circle cx="16" cy="8.5" r="5.4" fill="#e0399a" />
      <circle cx="16" cy="8.5" r="1.7" fill="#f5c542" />
    </svg>
  );
}

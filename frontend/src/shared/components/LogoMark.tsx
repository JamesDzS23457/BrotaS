// Marca de Brota: un pimpollo de rosa que brota de un tallo con dos hojas. Decorativa.
export default function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      {/* Pimpollo: tres capas de pétalos */}
      <path
        d="M16.2 3.2c3.9 0 6.4 2.9 6.4 6.4 0 3.5-2.6 6.7-6.4 9.9-3.8-3.2-6.4-6.4-6.4-9.9 0-3.5 2.5-6.4 6.4-6.4Z"
        fill="#c71d80"
      />
      <path
        d="M16.2 6.4c2.4 0 4 1.8 4 3.9 0 2.1-1.6 4.1-4 6.1-2.4-2-4-4-4-6.1 0-2.1 1.6-3.9 4-3.9Z"
        fill="#e0399a"
      />
      <path
        d="M16.2 9.7c1.2 0 2 .9 2 2 0 1.1-.8 2-2 3-1.2-1-2-1.9-2-3 0-1.1.8-2 2-2Z"
        fill="#f27ab8"
      />
      {/* Tallo */}
      <path
        d="M16.2 19.4c-.7 3.2-1 6.4-1 9.4"
        stroke="#2b7a58"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Hojas */}
      <path d="M15.6 23.6C12 23.2 9.6 21.2 9 17.6c3.6-.4 6.2 1.6 6.6 6Z" fill="#37906a" />
      <path d="M16.6 26.6c3.6-.4 6-2.4 6.6-6-3.6-.4-6.2 1.6-6.6 6Z" fill="#2b7a58" />
    </svg>
  );
}

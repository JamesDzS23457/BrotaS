// Campo de tallos: el único adorno de la marca. Decorativo (aria-hidden).
export default function StemField({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 720 560"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMax meet"
    >
      <g className="stem-field" stroke="#37906a" strokeWidth="7" strokeLinecap="round">
        <path d="M110 560C110 470 96 360 122 250" />
        <path d="M225 560C225 460 210 280 232 150" />
        <path d="M330 560C330 450 318 240 326 92" />
        <path d="M445 560C445 460 458 300 448 190" />
        <path d="M545 560C545 470 534 360 552 250" />
        <path d="M635 560C635 450 648 290 626 170" />
      </g>

      <g className="stem-field stem-leaves" fill="#2b7a58">
        <ellipse cx="80" cy="440" rx="34" ry="13" transform="rotate(22 80 440)" />
        <ellipse cx="196" cy="400" rx="34" ry="13" transform="rotate(-18 196 400)" />
        <ellipse cx="300" cy="300" rx="34" ry="13" transform="rotate(20 300 300)" />
        <ellipse cx="478" cy="360" rx="34" ry="13" transform="rotate(-16 478 360)" />
        <ellipse cx="578" cy="410" rx="32" ry="12" transform="rotate(16 578 410)" />
        <ellipse cx="668" cy="330" rx="30" ry="12" transform="rotate(-20 668 330)" />
      </g>

      {/* La flor: el único acento fuerte de la pantalla */}
      <g className="stem-bloom">
        <g fill="#e0399a">
          <ellipse cx="326" cy="54" rx="17" ry="30" transform="rotate(0 326 92)" />
          <ellipse cx="326" cy="54" rx="17" ry="30" transform="rotate(72 326 92)" />
          <ellipse cx="326" cy="54" rx="17" ry="30" transform="rotate(144 326 92)" />
          <ellipse cx="326" cy="54" rx="17" ry="30" transform="rotate(216 326 92)" />
          <ellipse cx="326" cy="54" rx="17" ry="30" transform="rotate(288 326 92)" />
        </g>
        <circle cx="326" cy="92" r="13" fill="#f5c542" />
      </g>

      <circle className="stem-bloom" cx="626" cy="170" r="10" fill="#e0399a" />
      <circle className="stem-bloom" cx="122" cy="250" r="8" fill="#e0399a" />
    </svg>
  );
}

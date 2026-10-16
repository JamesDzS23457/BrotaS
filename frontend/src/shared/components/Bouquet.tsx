// Ramo del login: el héroe de la pantalla. Un balde con rosa, crisantemo, tulipán y follaje.
// Es decorativo (aria-hidden); la entrada y el vaivén viven en index.css.
export default function Bouquet({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 900 650"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <radialGradient id="brota-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1d5c3f" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#1d5c3f" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Resplandor detrás del ramo: separa al ramo del fondo */}
      <ellipse cx="450" cy="370" rx="370" ry="300" fill="url(#brota-glow)" />

      {/* Follaje lejano, más oscuro que el fondo, para dar profundidad */}
      <g fill="#0b2319">
        <path d="M-420 660C-400 540-300 460-80 430C-110 555-230 625-420 660Z" />
        <path d="M-300 660C-280 495-140 390 110 350C90 500-60 610-300 660Z" />
        <path d="M210 660C255 588 355 545 500 528C480 605 355 648 210 660Z" />
        <path d="M690 660C645 588 545 545 400 528C420 605 545 648 690 660Z" />
        <path d="M1200 660C1180 495 1040 390 790 350C810 500 960 610 1200 660Z" />
        <path d="M1320 660C1300 540 1200 460 980 430C1010 555 1130 625 1320 660Z" />
      </g>

      {/* Sombra de contacto del balde */}
      <ellipse cx="450" cy="622" rx="135" ry="11" fill="#07180f" opacity="0.35" />

      <g className="bouquet-sway">
        {/* Tallos, hojas y ramitas: brotan desde la boca del balde */}
        <g className="bouquet-stems">
          <g stroke="#37906a" strokeWidth="6" strokeLinecap="round">
            <path d="M400 528C360 470 315 340 302 262" />
            <path d="M448 528C448 420 450 280 452 145" />
            <path d="M505 528C550 452 592 330 600 228" />
            <path d="M372 528C320 480 262 400 236 336" />
            <path d="M540 528C590 490 660 390 690 326" />
            <path d="M440 528C425 470 402 350 397 296" />
            <path d="M470 528C495 480 512 400 518 352" />
          </g>

          {/* Ramitas de la gypsófila */}
          <g stroke="#37906a" strokeWidth="3" strokeLinecap="round">
            <path d="M397 296L388 268M397 296L406 270M397 296L383 280M397 296L401 282M397 296L412 276" />
            <path d="M690 326L681 296M690 326L700 298M690 326L676 308M690 326L694 310M690 326L705 304" />
            <path d="M518 352L510 326M518 352L526 328M518 352L505 336M518 352L521 338M518 352L530 332" />
          </g>

          <g fill="#2b7a58">
            <path d="M330 382C292 376 262 350 252 306C296 311 326 340 330 382Z" />
            <path d="M575 382C613 376 643 350 653 306C609 311 579 340 575 382Z" />
            <path d="M300 442C262 436 232 410 222 366C266 371 296 400 300 442Z" />
            <path d="M640 422C678 416 708 390 718 346C674 351 644 380 640 422Z" />
            <path d="M500 422C462 416 432 390 422 346C466 351 496 380 500 422Z" />
          </g>

          <g fill="#37906a">
            <path d="M450 332C488 326 518 300 528 256C484 261 454 290 450 332Z" />
            <ellipse cx="530" cy="348" rx="19" ry="10" transform="rotate(-24 530 348)" />
            <ellipse cx="508" cy="360" rx="17" ry="9" transform="rotate(18 508 360)" />
            <ellipse cx="418" cy="330" rx="18" ry="9" transform="rotate(-20 418 330)" />
          </g>
        </g>

        {/* Flores */}
        <g>
          {/* Rosa: la flor protagonista */}
          <g className="bouquet-blossom" style={{ animationDelay: "780ms" }}>
            <g fill="#d6208c" stroke="#b3166f" strokeWidth="2">
              <ellipse cx="452" cy="86" rx="21" ry="29" transform="rotate(0 452 108)" />
              <ellipse cx="452" cy="86" rx="21" ry="29" transform="rotate(72 452 108)" />
              <ellipse cx="452" cy="86" rx="21" ry="29" transform="rotate(144 452 108)" />
              <ellipse cx="452" cy="86" rx="21" ry="29" transform="rotate(216 452 108)" />
              <ellipse cx="452" cy="86" rx="21" ry="29" transform="rotate(288 452 108)" />
            </g>
            <g fill="#e0399a">
              <ellipse cx="452" cy="93" rx="17" ry="23" transform="rotate(36 452 108)" />
              <ellipse cx="452" cy="93" rx="17" ry="23" transform="rotate(108 452 108)" />
              <ellipse cx="452" cy="93" rx="17" ry="23" transform="rotate(180 452 108)" />
              <ellipse cx="452" cy="93" rx="17" ry="23" transform="rotate(252 452 108)" />
              <ellipse cx="452" cy="93" rx="17" ry="23" transform="rotate(324 452 108)" />
            </g>
            <circle cx="452" cy="108" r="12" fill="#f27ab8" />
            <path
              d="M452 108c-7-2-9-8-5-12"
              stroke="#b3166f"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>

          {/* Crisantemo: muchos pétalos finos */}
          <g className="bouquet-blossom" style={{ animationDelay: "900ms" }}>
            <g fill="#f7d9e8">
              <ellipse cx="302" cy="212" rx="7" ry="22" transform="rotate(0 302 232)" />
              <ellipse cx="302" cy="212" rx="7" ry="22" transform="rotate(30 302 232)" />
              <ellipse cx="302" cy="212" rx="7" ry="22" transform="rotate(60 302 232)" />
              <ellipse cx="302" cy="212" rx="7" ry="22" transform="rotate(90 302 232)" />
              <ellipse cx="302" cy="212" rx="7" ry="22" transform="rotate(120 302 232)" />
              <ellipse cx="302" cy="212" rx="7" ry="22" transform="rotate(150 302 232)" />
              <ellipse cx="302" cy="212" rx="7" ry="22" transform="rotate(180 302 232)" />
              <ellipse cx="302" cy="212" rx="7" ry="22" transform="rotate(210 302 232)" />
              <ellipse cx="302" cy="212" rx="7" ry="22" transform="rotate(240 302 232)" />
              <ellipse cx="302" cy="212" rx="7" ry="22" transform="rotate(270 302 232)" />
              <ellipse cx="302" cy="212" rx="7" ry="22" transform="rotate(300 302 232)" />
              <ellipse cx="302" cy="212" rx="7" ry="22" transform="rotate(330 302 232)" />
            </g>
            <circle cx="302" cy="232" r="11" fill="#f5c542" />
          </g>

          {/* Tulipán: tres pétalos con punta */}
          <g className="bouquet-blossom" style={{ animationDelay: "1020ms" }}>
            <path
              d="M600 168c11 0 18 9 18 22 0 24-7 44-18 58-11-14-18-34-18-58 0-13 7-22 18-22Z"
              fill="#e0399a"
            />
            <path
              d="M580 184c9-7 18 0 19 13 2 22-2 42-11 53-8-11-12-29-12-44 0-10 2-17 4-22Z"
              fill="#b3166f"
            />
            <path
              d="M620 184c-9-7-18 0-19 13-2 22 2 42 11 53 8-11 12-29 12-44 0-10-2-17-4-22Z"
              fill="#b3166f"
            />
          </g>

          {/* Capullo de rosa con sépalos */}
          <g className="bouquet-blossom" style={{ animationDelay: "660ms" }}>
            <path
              d="M232 286c13 0 22 11 22 25 0 15-10 28-22 35-12-7-22-20-22-35 0-14 9-25 22-25Z"
              fill="#e0399a"
            />
            <path
              d="M232 292c8 0 14 8 14 19 0 11-6 21-14 26-8-5-14-15-14-26 0-11 6-19 14-19Z"
              fill="#f27ab8"
            />
            <path
              d="M228 296c-5 7-6 17-3 26M236 296c5 7 6 17 3 26"
              stroke="#c71d80"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path d="M232 348c-10-2-17-10-17-21 11 0 18 8 20 18Z" fill="#2b7a58" />
            <path d="M232 348c10-2 17-10 17-21-11 0-18 8-20 18Z" fill="#37906a" />
          </g>

          {/* Gypsófila: nubes de puntos al final de cada ramita */}
          <g className="bouquet-blossom" fill="#f7d9e8" style={{ animationDelay: "1140ms" }}>
            <circle cx="388" cy="268" r="6" />
            <circle cx="406" cy="270" r="5" />
            <circle cx="383" cy="280" r="5" />
            <circle cx="401" cy="282" r="6" />
            <circle cx="412" cy="276" r="5" />
            <circle cx="681" cy="296" r="6" />
            <circle cx="700" cy="298" r="5" />
            <circle cx="676" cy="308" r="5" />
            <circle cx="694" cy="310" r="6" />
            <circle cx="705" cy="304" r="5" />
            <circle cx="510" cy="326" r="5" />
            <circle cx="526" cy="328" r="4" />
            <circle cx="505" cy="336" r="5" />
            <circle cx="521" cy="338" r="5" />
            <circle cx="530" cy="332" r="4" />
          </g>
        </g>
      </g>

      {/* Balde, dibujado encima para tapar el nacimiento de los tallos */}
      <g className="bouquet-vase">
        <path d="M330 522h240l-20 90q-1 8-9 8H359q-8 0-9-8Z" fill="#1b4a35" />
        <path d="M352 528l-7 82h24l9-82Z" fill="#275c44" />
        <ellipse cx="450" cy="522" rx="120" ry="14" fill="#276b4a" />
        <ellipse cx="450" cy="522" rx="110" ry="10" fill="#0b2018" />
      </g>
    </svg>
  );
}

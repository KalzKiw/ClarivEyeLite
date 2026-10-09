/** Mascota Clariv — caja de cartón de logística con ojos. */
export function BoxMascot({
  className = "",
  mood = "happy",
}: {
  className?: string;
  mood?: "happy" | "wink" | "wow";
}) {
  const eyes =
    mood === "wink" ? (
      <>
        {/* ojo izq cerrado */}
        <path d="M34 58 H46" stroke="#3b2314" strokeWidth="3.2" strokeLinecap="round" />
        {/* ojo der abierto */}
        <ellipse cx="68" cy="58" rx="7" ry="8.5" fill="#fffef8" />
        <circle cx="69" cy="59" r="3.8" fill="#2a1810" />
        <circle cx="70.5" cy="56.5" r="1.3" fill="#fff" />
      </>
    ) : mood === "wow" ? (
      <>
        <ellipse cx="40" cy="57" rx="8" ry="9.5" fill="#fffef8" />
        <circle cx="41" cy="58" r="4.2" fill="#2a1810" />
        <circle cx="42.5" cy="55.5" r="1.4" fill="#fff" />
        <ellipse cx="70" cy="57" rx="8" ry="9.5" fill="#fffef8" />
        <circle cx="71" cy="58" r="4.2" fill="#2a1810" />
        <circle cx="72.5" cy="55.5" r="1.4" fill="#fff" />
      </>
    ) : (
      <>
        <ellipse cx="40" cy="58" rx="7" ry="8.5" fill="#fffef8" />
        <circle cx="41" cy="59" r="3.8" fill="#2a1810" />
        <circle cx="42.5" cy="56.5" r="1.3" fill="#fff" />
        <ellipse cx="70" cy="58" rx="7" ry="8.5" fill="#fffef8" />
        <circle cx="71" cy="59" r="3.8" fill="#2a1810" />
        <circle cx="72.5" cy="56.5" r="1.3" fill="#fff" />
      </>
    );

  const mouth =
    mood === "wow" ? (
      <ellipse cx="55" cy="78" rx="6.5" ry="7.5" fill="#3b2314" />
    ) : (
      <path
        d="M42 76 Q55 88 68 76"
        stroke="#3b2314"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    );

  return (
    <svg
      viewBox="0 0 110 124"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Sombra */}
      <ellipse cx="55" cy="116" rx="38" ry="5.5" fill="#3b2314" fillOpacity="0.22" />

      {/* Cuerpo — perspectiva isométrica de caja cerrada */}
      {/* Tapa / cara superior */}
      <path d="M18 40 L55 20 L92 40 L55 60 Z" fill="#d4a574" />
      {/* Cara izquierda */}
      <path d="M18 40 L18 86 L55 106 L55 60 Z" fill="#a67c52" />
      {/* Cara derecha */}
      <path d="M55 60 L55 106 L92 86 L92 40 Z" fill="#c4956a" />

      {/* Solapas / pliegues de cartón */}
      <path d="M18 40 L55 60 L92 40" stroke="#8b5e3c" strokeWidth="1.2" fill="none" />
      <path d="M36.5 30 L36.5 50" stroke="#8b5e3c" strokeWidth="1" strokeOpacity="0.55" />
      <path d="M73.5 30 L73.5 50" stroke="#8b5e3c" strokeWidth="1" strokeOpacity="0.55" />

      {/* Cinta de embalar (beige translúcida) */}
      <path d="M50 24 L50 98" stroke="#e8d5b5" strokeWidth="9" strokeOpacity="0.85" strokeLinecap="butt" />
      <path d="M26 50 L84 50" stroke="#e8d5b5" strokeWidth="9" strokeOpacity="0.85" strokeLinecap="butt" />
      <path d="M50 24 L50 98" stroke="#c4a882" strokeWidth="1" strokeOpacity="0.5" />
      <path d="M26 50 L84 50" stroke="#c4a882" strokeWidth="1" strokeOpacity="0.5" />

      {/* Etiqueta de envío */}
      <rect x="62" y="68" width="22" height="16" rx="1.5" fill="#f5f0e6" stroke="#8b5e3c" strokeWidth="0.8" />
      <path d="M65 73 H81 M65 77 H78 M65 81 H75" stroke="#a67c52" strokeWidth="1.2" strokeLinecap="round" />

      {/* Cara */}
      <g>{eyes}{mouth}</g>

      {/* Mejillas suave */}
      <circle cx="28" cy="72" r="4.5" fill="#c45c3a" fillOpacity="0.35" />
      <circle cx="82" cy="72" r="4.5" fill="#c45c3a" fillOpacity="0.35" />
    </svg>
  );
}

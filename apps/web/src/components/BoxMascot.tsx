/** Mascota Clariv — caja cartón (estilo ref) con ojos almendrados + iris. */
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
        <path
          d="M40 78 Q50 72 60 78"
          stroke="#2c1810"
          strokeWidth="3.2"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="82" cy="77" rx="10" ry="11.5" fill="#fffef9" stroke="#2c1810" strokeWidth="2.3" />
        <circle cx="83.5" cy="78.5" r="5" fill="#5c3a1e" />
        <circle cx="85.4" cy="76" r="1.7" fill="#fff" />
      </>
    ) : mood === "wow" ? (
      <>
        <ellipse cx="50" cy="76" rx="11" ry="13" fill="#fffef9" stroke="#2c1810" strokeWidth="2.3" />
        <circle cx="51" cy="78" r="5.6" fill="#5c3a1e" />
        <circle cx="53" cy="75.2" r="1.9" fill="#fff" />
        <ellipse cx="82" cy="76" rx="11" ry="13" fill="#fffef9" stroke="#2c1810" strokeWidth="2.3" />
        <circle cx="83" cy="78" r="5.6" fill="#5c3a1e" />
        <circle cx="85" cy="75.2" r="1.9" fill="#fff" />
      </>
    ) : (
      <>
        {/* Ojos tipo pet: blanco + iris marrón (no bolas negras de la foto) */}
        <ellipse cx="50" cy="77" rx="10" ry="11.5" fill="#fffef9" stroke="#2c1810" strokeWidth="2.3" />
        <circle cx="51.5" cy="78.5" r="5" fill="#5c3a1e" />
        <circle cx="53.4" cy="76" r="1.7" fill="#fff" />
        <ellipse cx="82" cy="77" rx="10" ry="11.5" fill="#fffef9" stroke="#2c1810" strokeWidth="2.3" />
        <circle cx="83.5" cy="78.5" r="5" fill="#5c3a1e" />
        <circle cx="85.4" cy="76" r="1.7" fill="#fff" />
      </>
    );

  const mouth =
    mood === "wow" ? (
      <ellipse cx="66" cy="100" rx="6" ry="7" fill="#2c1810" />
    ) : (
      <path
        d="M54 98 Q66 108 78 98"
        stroke="#2c1810"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    );

  return (
    <svg
      viewBox="0 0 132 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="cmTop" x1="24" y1="14" x2="110" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f4dbb8" />
          <stop offset="1" stopColor="#e5c39b" />
        </linearGradient>
        <linearGradient id="cmSide" x1="16" y1="48" x2="42" y2="128" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d0a676" />
          <stop offset="1" stopColor="#bc9160" />
        </linearGradient>
        <linearGradient id="cmFace" x1="40" y1="52" x2="118" y2="128" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f0d2aa" />
          <stop offset="1" stopColor="#e0ba8a" />
        </linearGradient>
      </defs>

      <ellipse cx="66" cy="130" rx="42" ry="5.5" fill="#3b2314" fillOpacity="0.18" />

      {/* Caja 3/4 — proporciones cercanas a la ref */}
      <path
        d="M26 48 L70 20 L114 48 L70 76 Z"
        fill="url(#cmTop)"
        stroke="#2c1810"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path
        d="M26 48 L26 104 L70 132 L70 76 Z"
        fill="url(#cmSide)"
        stroke="#2c1810"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path
        d="M70 76 L70 132 L114 104 L114 48 Z"
        fill="url(#cmFace)"
        stroke="#2c1810"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />

      {/* Solapa */}
      <path d="M48 34 L70 48 L92 34" stroke="#2c1810" strokeWidth="1.7" fill="none" strokeLinecap="round" />

      {/* Cinta embalar */}
      <path
        d="M60 28 L70 34 L80 28 L80 52 L70 58 L60 52 Z"
        fill="#8b5e3c"
        stroke="#2c1810"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M60 52 L60 64 L70 70 L80 64 L80 52 L70 58 Z"
        fill="#6f4a30"
        stroke="#2c1810"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* Cara sobre el panel frontal (derecha) */}
      <g transform="translate(22 8)">
        {eyes}
        <circle cx="38" cy="92" r="6" fill="#f0a07a" fillOpacity="0.55" />
        <circle cx="94" cy="92" r="6" fill="#f0a07a" fillOpacity="0.55" />
        {mouth}
      </g>
    </svg>
  );
}

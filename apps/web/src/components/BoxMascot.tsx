/**
 * Mascota Clariv — caja isométrica tipo 📦.
 * Cinta solo en tapa + cara izquierda. Cara derecha = ojos (sin cinta).
 */
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
        <path d="M78 80 Q86 75 94 80" stroke="#2a1810" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        <ellipse cx="104" cy="79" rx="7.5" ry="8.5" fill="#fffef9" />
        <circle cx="105" cy="80" r="3.6" fill="#4a2e18" />
        <circle cx="106.2" cy="78.2" r="1.2" fill="#fff" />
      </>
    ) : mood === "wow" ? (
      <>
        <ellipse cx="86" cy="78" rx="8.5" ry="10" fill="#fffef9" />
        <circle cx="86.5" cy="79.5" r="4.2" fill="#4a2e18" />
        <circle cx="88" cy="77.5" r="1.3" fill="#fff" />
        <ellipse cx="106" cy="78" rx="8.5" ry="10" fill="#fffef9" />
        <circle cx="106.5" cy="79.5" r="4.2" fill="#4a2e18" />
        <circle cx="108" cy="77.5" r="1.3" fill="#fff" />
      </>
    ) : (
      <>
        <ellipse cx="86" cy="79" rx="7.5" ry="8.5" fill="#fffef9" />
        <circle cx="87" cy="80" r="3.6" fill="#4a2e18" />
        <circle cx="88.2" cy="78.2" r="1.2" fill="#fff" />
        <ellipse cx="106" cy="79" rx="7.5" ry="8.5" fill="#fffef9" />
        <circle cx="107" cy="80" r="3.6" fill="#4a2e18" />
        <circle cx="108.2" cy="78.2" r="1.2" fill="#fff" />
      </>
    );

  const mouth =
    mood === "wow" ? (
      <ellipse cx="96" cy="96" rx="4.5" ry="5.5" fill="#2a1810" />
    ) : (
      <path d="M88 94 Q96 101 104 94" stroke="#2a1810" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    );

  return (
    <svg
      viewBox="0 0 140 148"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <ellipse cx="70" cy="138" rx="48" ry="6" fill="#3b2314" fillOpacity="0.16" />

      {/* Top / Left / Right */}
      <path d="M20 48 L70 20 L120 48 L70 76 Z" fill="#e8c9a0" />
      <path d="M20 48 L20 98 L70 126 L70 76 Z" fill="#c9a06e" />
      <path d="M70 76 L70 126 L120 98 L120 48 Z" fill="#a67c4a" />

      {/* Cinta en TAPA (solo diamante superior) */}
      <path
        d="M31 43 L70 36 L109 43 L109 53 L70 46 L31 53 Z"
        fill="#dcc6a4"
      />
      <path
        d="M33 44 L70 37.5 L107 44 L107 47 L70 40.5 L33 47 Z"
        fill="#ebe0cc"
        fillOpacity="0.5"
      />

      {/*
        Cinta en CARA IZQUIERDA únicamente (x < 70).
        Centrada en el paralelogramo izq: lerp 0.36–0.64 del borde superior/inferior.
      */}
      <path
        d="M38 58.1 L52 65.9 L52 115.9 L38 108.1 Z"
        fill="#dcc6a4"
      />
      <path
        d="M39.5 59.5 L50.5 65.7 L50.5 69.5 L39.5 63.3 Z"
        fill="#ebe0cc"
        fillOpacity="0.4"
      />

      {/* Iconos envío — cara izquierda */}
      <g transform="translate(24 100)" opacity="0.8">
        <path d="M5 0 V7 M2.5 3.5 L5 0 L7.5 3.5" stroke="#5c5044" strokeWidth="1.35" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 0 V7 M9.5 3.5 L12 0 L14.5 3.5" stroke="#5c5044" strokeWidth="1.35" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M1.5 9 H15.5" stroke="#5c5044" strokeWidth="1.25" strokeLinecap="round" />
        <path d="M22 0 L26 5.5 V9.5 H18 V5.5 Z M20 11.5 H24" stroke="#5c5044" strokeWidth="1.25" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M23.5 2.5 L25.5 4.5" stroke="#5c5044" strokeWidth="1.1" strokeLinecap="round" />
      </g>

      {/* Ojos — solo cara derecha (sin cinta) */}
      <circle cx="80" cy="90" r="4.5" fill="#e08968" fillOpacity="0.45" />
      <circle cx="112" cy="90" r="4.5" fill="#e08968" fillOpacity="0.45" />
      {eyes}
      {mouth}
    </svg>
  );
}

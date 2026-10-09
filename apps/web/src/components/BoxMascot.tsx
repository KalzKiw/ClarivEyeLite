/** Mascota Clariv — cajita con carita (SVG propio). */
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
        <path d="M38 52 H48" stroke="#1e1b4b" strokeWidth="3" strokeLinecap="round" />
        <circle cx="68" cy="52" r="4.5" fill="#1e1b4b" />
      </>
    ) : mood === "wow" ? (
      <>
        <circle cx="42" cy="52" r="5.5" fill="#1e1b4b" />
        <circle cx="68" cy="52" r="5.5" fill="#1e1b4b" />
      </>
    ) : (
      <>
        <circle cx="42" cy="52" r="4.5" fill="#1e1b4b" />
        <circle cx="68" cy="52" r="4.5" fill="#1e1b4b" />
      </>
    );

  const mouth =
    mood === "wow" ? (
      <ellipse cx="55" cy="72" rx="7" ry="8" fill="#1e1b4b" />
    ) : (
      <path d="M42 68 Q55 80 68 68" stroke="#1e1b4b" strokeWidth="3" fill="none" strokeLinecap="round" />
    );

  return (
    <svg
      viewBox="0 0 110 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Sombra */}
      <ellipse cx="55" cy="112" rx="36" ry="6" fill="#4c1d95" fillOpacity="0.25" />
      {/* Cuerpo caja */}
      <path d="M18 38 L55 18 L92 38 L55 58 Z" fill="#c4b5fd" />
      <path d="M18 38 L18 82 L55 102 L55 58 Z" fill="#7c3aed" />
      <path d="M55 58 L55 102 L92 82 L92 38 Z" fill="#8b5cf6" />
      {/* Cinta */}
      <path d="M48 23 L48 95" stroke="#f0abfc" strokeWidth="8" strokeLinecap="round" />
      <path d="M28 48 L82 48" stroke="#f0abfc" strokeWidth="8" strokeLinecap="round" />
      {/* Cara en el frontal */}
      <g transform="translate(0 8)">{eyes}{mouth}</g>
      {/* Mejillas */}
      <circle cx="32" cy="70" r="5" fill="#f9a8d4" fillOpacity="0.7" />
      <circle cx="78" cy="70" r="5" fill="#f9a8d4" fillOpacity="0.7" />
    </svg>
  );
}

/**
 * Mascota Clariv — caja isométrica tipo 📦.
 * Cinta: tapa + cara izq. Ojos tipo Clippy: esferas 3D que salen del plano.
 */

function ClippyEye({
  cx,
  cy,
  r = 16,
  pupilDx = 2.5,
  pupilDy = 2,
  closed,
}: {
  cx: number;
  cy: number;
  r?: number;
  pupilDx?: number;
  pupilDy?: number;
  closed?: boolean;
}) {
  const id = `eye-${cx}-${cy}`;
  if (closed) {
    return (
      <g>
        <ellipse cx={cx} cy={cy + 2} rx={r * 0.85} ry={r * 0.28} fill="#3b2314" fillOpacity="0.18" />
        <path
          d={`M${cx - r * 0.75} ${cy} Q${cx} ${cy - r * 0.35} ${cx + r * 0.75} ${cy}`}
          stroke="#2a1810"
          strokeWidth="3.2"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    );
  }

  return (
    <g>
      <defs>
        <radialGradient id={`${id}-ball`} cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f4f0ea" />
          <stop offset="100%" stopColor="#d4cfc6" />
        </radialGradient>
        <radialGradient id={`${id}-shade`} cx="70%" cy="78%" r="65%">
          <stop offset="40%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#3b2314" stopOpacity="0.22" />
        </radialGradient>
      </defs>
      {/* Sombra en la cara → el ojo “sale” del plano */}
      <ellipse
        cx={cx + 2}
        cy={cy + r * 0.55}
        rx={r * 0.95}
        ry={r * 0.38}
        fill="#3b2314"
        fillOpacity="0.28"
      />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-ball)`} />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-shade)`} />
      <ellipse
        cx={cx - r * 0.32}
        cy={cy - r * 0.38}
        rx={r * 0.28}
        ry={r * 0.22}
        fill="#fff"
        fillOpacity="0.95"
      />
      <ellipse
        cx={cx - r * 0.12}
        cy={cy - r * 0.18}
        rx={r * 0.1}
        ry={r * 0.08}
        fill="#fff"
        fillOpacity="0.7"
      />
      <circle cx={cx + pupilDx} cy={cy + pupilDy} r={r * 0.32} fill="#1a120c" />
      <circle
        cx={cx + pupilDx + r * 0.1}
        cy={cy + pupilDy - r * 0.12}
        r={r * 0.09}
        fill="#fff"
        fillOpacity="0.55"
      />
    </g>
  );
}

export function BoxMascot({
  className = "",
  mood = "happy",
}: {
  className?: string;
  mood?: "happy" | "wink" | "wow";
}) {
  const mouth =
    mood === "wow" ? (
      <ellipse cx="96" cy="108" rx="5" ry="6" fill="#2a1810" />
    ) : (
      <path
        d="M86 106 Q96 114 106 106"
        stroke="#2a1810"
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
      />
    );

  const browY = mood === "wow" ? 52 : 56;
  const browArch = mood === "wow" ? -6 : -3;

  return (
    <svg
      viewBox="0 0 140 148"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      overflow="visible"
    >
      <ellipse cx="70" cy="138" rx="48" ry="6" fill="#3b2314" fillOpacity="0.16" />

      {/* Caja */}
      <path d="M20 48 L70 20 L120 48 L70 76 Z" fill="#e8c9a0" />
      <path d="M20 48 L20 98 L70 126 L70 76 Z" fill="#c9a06e" />
      <path d="M70 76 L70 126 L120 98 L120 48 Z" fill="#a67c4a" />

      {/* Cinta tapa */}
      <path d="M31 43 L70 36 L109 43 L109 53 L70 46 L31 53 Z" fill="#dcc6a4" />
      <path d="M33 44 L70 37.5 L107 44 L107 47 L70 40.5 L33 47 Z" fill="#ebe0cc" fillOpacity="0.5" />

      {/* Cinta cara izquierda */}
      <path d="M38 58.1 L52 65.9 L52 115.9 L38 108.1 Z" fill="#dcc6a4" />
      <path d="M39.5 59.5 L50.5 65.7 L50.5 69.5 L39.5 63.3 Z" fill="#ebe0cc" fillOpacity="0.4" />

      {/* Iconos envío */}
      <g transform="translate(24 100)" opacity="0.8">
        <path d="M5 0 V7 M2.5 3.5 L5 0 L7.5 3.5" stroke="#5c5044" strokeWidth="1.35" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 0 V7 M9.5 3.5 L12 0 L14.5 3.5" stroke="#5c5044" strokeWidth="1.35" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M1.5 9 H15.5" stroke="#5c5044" strokeWidth="1.25" strokeLinecap="round" />
        <path d="M22 0 L26 5.5 V9.5 H18 V5.5 Z M20 11.5 H24" stroke="#5c5044" strokeWidth="1.25" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M23.5 2.5 L25.5 4.5" stroke="#5c5044" strokeWidth="1.1" strokeLinecap="round" />
      </g>

      {/* Cejas estilo Clippy (flotando encima) */}
      {mood !== "wink" && (
        <g stroke="#1a120c" strokeWidth="3.2" fill="none" strokeLinecap="round">
          <path d={`M74 ${browY + 4} Q84 ${browY + browArch} 94 ${browY + 2}`} />
          <path d={`M98 ${browY + 2} Q108 ${browY + browArch} 118 ${browY + 4}`} />
        </g>
      )}

      {/* Ojos 3D Clippy — sobresalen del panel derecho */}
      {mood === "wink" ? (
        <>
          <ClippyEye cx={84} cy={78} r={15} closed />
          <ClippyEye cx={108} cy={76} r={16.5} pupilDx={3} pupilDy={1.5} />
        </>
      ) : mood === "wow" ? (
        <>
          <ClippyEye cx={84} cy={76} r={17.5} pupilDx={0} pupilDy={1} />
          <ClippyEye cx={108} cy={74} r={17.5} pupilDx={0} pupilDy={1} />
        </>
      ) : (
        <>
          <ClippyEye cx={84} cy={78} r={16} pupilDx={2.5} pupilDy={2} />
          <ClippyEye cx={108} cy={76} r={16.5} pupilDx={3} pupilDy={1.5} />
        </>
      )}

      {mouth}
    </svg>
  );
}

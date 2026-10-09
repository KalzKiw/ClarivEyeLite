/**
 * Mascota Clariv — caja isométrica tipo 📦.
 * Cinta: tapa + cara izq. Ojos ovalados 3D que salen hacia arriba (Clippy).
 */

function ClippyEye({
  cx,
  cy,
  rx = 11,
  ry = 18,
  pupilDx = 1.5,
  pupilDy = 3,
  closed,
}: {
  cx: number;
  cy: number;
  rx?: number;
  ry?: number;
  pupilDx?: number;
  pupilDy?: number;
  closed?: boolean;
}) {
  const id = `eye-${Math.round(cx)}-${Math.round(cy)}`;
  if (closed) {
    return (
      <g>
        <ellipse cx={cx + 1} cy={cy + ry * 0.35} rx={rx * 0.9} ry={ry * 0.2} fill="#3b2314" fillOpacity="0.2" />
        <path
          d={`M${cx - rx * 0.85} ${cy} Q${cx} ${cy - ry * 0.25} ${cx + rx * 0.85} ${cy}`}
          stroke="#2a1810"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    );
  }

  const pupilR = Math.min(rx, ry) * 0.42;

  return (
    <g>
      <defs>
        <radialGradient id={`${id}-ball`} cx="36%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#f6f2ec" />
          <stop offset="100%" stopColor="#cfc8be" />
        </radialGradient>
        <radialGradient id={`${id}-shade`} cx="68%" cy="82%" r="60%">
          <stop offset="35%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#3b2314" stopOpacity="0.25" />
        </radialGradient>
      </defs>
      {/* Sombra en la caja (el óvalo “apoya” y sale hacia arriba) */}
      <ellipse
        cx={cx + 1.5}
        cy={cy + ry * 0.72}
        rx={rx * 1.05}
        ry={ry * 0.28}
        fill="#3b2314"
        fillOpacity="0.3"
      />
      {/* Globo ovalado vertical */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id}-ball)`} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id}-shade)`} />
      {/* Brillos */}
      <ellipse
        cx={cx - rx * 0.28}
        cy={cy - ry * 0.42}
        rx={rx * 0.32}
        ry={ry * 0.22}
        fill="#fff"
        fillOpacity="0.95"
      />
      <ellipse
        cx={cx - rx * 0.08}
        cy={cy - ry * 0.18}
        rx={rx * 0.12}
        ry={ry * 0.08}
        fill="#fff"
        fillOpacity="0.65"
      />
      {/* Pupila */}
      <circle cx={cx + pupilDx} cy={cy + pupilDy} r={pupilR} fill="#1a120c" />
      <circle
        cx={cx + pupilDx + pupilR * 0.35}
        cy={cy + pupilDy - pupilR * 0.35}
        r={pupilR * 0.28}
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

  /* Óvalos anclados bajos en la cara y creciendo hacia arriba (salen del plano) */
  const eyeY = mood === "wow" ? 58 : 62;
  const eyeRy = mood === "wow" ? 22 : 19;
  const eyeRx = mood === "wow" ? 12.5 : 11;
  const browY = eyeY - eyeRy - 6;

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

      {/* Cejas encima de los óvalos */}
      {mood !== "wink" && (
        <g stroke="#1a120c" strokeWidth="3" fill="none" strokeLinecap="round">
          <path d={`M74 ${browY + 5} Q84 ${browY - 2} 92 ${browY + 3}`} />
          <path d={`M100 ${browY + 3} Q108 ${browY - 2} 118 ${browY + 5}`} />
        </g>
      )}

      {/* Ojos ovalados — salen hacia arriba del panel derecho */}
      {mood === "wink" ? (
        <>
          <ClippyEye cx={84} cy={eyeY} rx={eyeRx} ry={eyeRy} closed />
          <ClippyEye cx={108} cy={eyeY - 2} rx={eyeRx + 0.5} ry={eyeRy + 1} pupilDx={2} pupilDy={4} />
        </>
      ) : (
        <>
          <ClippyEye cx={84} cy={eyeY} rx={eyeRx} ry={eyeRy} pupilDx={1.5} pupilDy={mood === "wow" ? 1 : 3} />
          <ClippyEye cx={108} cy={eyeY - 2} rx={eyeRx + 0.5} ry={eyeRy + 1} pupilDx={2} pupilDy={mood === "wow" ? 1 : 2.5} />
        </>
      )}

      {mouth}
    </svg>
  );
}

/**
 * Mascota ClarivPack — caja isométrica cartoon (misma línea, más expresiva).
 * Moods: happy | wink | wow
 */

function CartoonEye({
  cx,
  cy,
  rx = 13,
  ry = 17,
  pupilDx = 2,
  pupilDy = 2,
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
  const gid = `ce-${Math.round(cx)}-${Math.round(cy)}`;
  if (closed) {
    return (
      <g>
        <ellipse
          cx={cx + 1}
          cy={cy + 2}
          rx={rx * 0.95}
          ry={ry * 0.22}
          fill="#2a1810"
          fillOpacity="0.18"
        />
        <path
          d={`M${cx - rx * 0.9} ${cy + 1} Q${cx} ${cy - ry * 0.35} ${cx + rx * 0.9} ${cy + 1}`}
          stroke="#1a120c"
          strokeWidth="3.2"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    );
  }

  const pupilR = Math.min(rx, ry) * 0.48;

  return (
    <g>
      <defs>
        <radialGradient id={`${gid}-w`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#f3efe8" />
          <stop offset="100%" stopColor="#d9d2c8" />
        </radialGradient>
      </defs>
      {/* sombra bajo el ojo */}
      <ellipse
        cx={cx + 1.5}
        cy={cy + ry * 0.65}
        rx={rx * 1.05}
        ry={ry * 0.22}
        fill="#2a1810"
        fillOpacity="0.22"
      />
      {/* globo */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={`url(#${gid}-w)`}
        stroke="#1a120c"
        strokeWidth="3"
      />
      {/* brillo grande */}
      <ellipse
        cx={cx - rx * 0.32}
        cy={cy - ry * 0.38}
        rx={rx * 0.34}
        ry={ry * 0.24}
        fill="#fff"
      />
      {/* pupila */}
      <circle cx={cx + pupilDx} cy={cy + pupilDy} r={pupilR} fill="#1a120c" />
      <circle
        cx={cx + pupilDx + pupilR * 0.32}
        cy={cy + pupilDy - pupilR * 0.38}
        r={pupilR * 0.32}
        fill="#fff"
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
  const wow = mood === "wow";
  const eyeY = wow ? 56 : 60;
  const eyeRy = wow ? 20 : 17;
  const eyeRx = wow ? 14 : 12.5;
  const browY = eyeY - eyeRy - 5;

  const mouth =
    mood === "wow" ? (
      <ellipse cx="98" cy="108" rx="7" ry="8" fill="#1a120c" stroke="#0a0705" strokeWidth="1.5" />
    ) : (
      <path
        d="M84 104 Q98 118 112 104"
        stroke="#1a120c"
        strokeWidth="3.4"
        fill="none"
        strokeLinecap="round"
      />
    );

  return (
    <svg
      viewBox="0 0 140 148"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      overflow="visible"
    >
      {/* Sombra suelo (pegatina) */}
      <ellipse cx="70" cy="139" rx="46" ry="5.5" fill="#2a1810" fillOpacity="0.18" />

      {/* ——— Caja isométrica (colores flat cartoon) ——— */}
      {/* Contorno exterior grueso */}
      <path
        d="M20 48 L70 18 L120 48 L120 98 L70 128 L20 98 Z"
        fill="#1a120c"
      />

      {/* Tapa */}
      <path d="M24 48 L70 24 L116 48 L70 72 Z" fill="#f0d2a8" />
      {/* Cara izq */}
      <path d="M24 48 L24 96 L70 122 L70 72 Z" fill="#d4a574" />
      {/* Cara der */}
      <path d="M70 72 L70 122 L116 96 L116 48 Z" fill="#b8844f" />

      {/* Aristas internas (blanco suave) */}
      <path
        d="M24 48 L70 72 L116 48"
        stroke="#fff8ee"
        strokeWidth="2"
        strokeOpacity="0.55"
        fill="none"
        strokeLinejoin="round"
      />
      <path
        d="M70 72 L70 122"
        stroke="#fff8ee"
        strokeWidth="2"
        strokeOpacity="0.35"
        fill="none"
      />

      {/* Cinta tapa */}
      <path d="M34 42 L70 34 L106 42 L106 52 L70 44 L34 52 Z" fill="#ebe0cc" stroke="#1a120c" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M36 43.5 L70 36 L104 43.5 L104 46.5 L70 39 L36 46.5 Z" fill="#fff" fillOpacity="0.45" />

      {/* Cinta cara izquierda */}
      <path
        d="M40 58 L54 66 L54 112 L40 104 Z"
        fill="#ebe0cc"
        stroke="#1a120c"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M42 60 L52 65.5 L52 69 L42 63.5 Z" fill="#fff" fillOpacity="0.4" />

      {/* Mejillas */}
      {(mood === "happy" || mood === "wink") && (
        <g fill="#f4a89a" fillOpacity="0.55">
          <ellipse cx="82" cy="96" rx="7" ry="4.5" />
          <ellipse cx="114" cy="94" rx="7.5" ry="4.5" />
        </g>
      )}

      {/* Cejas */}
      {mood !== "wink" && (
        <g stroke="#1a120c" strokeWidth="3.6" fill="none" strokeLinecap="round">
          {wow ? (
            <>
              <path d={`M74 ${browY + 2} Q84 ${browY - 6} 94 ${browY + 1}`} />
              <path d={`M102 ${browY + 1} Q112 ${browY - 6} 122 ${browY + 2}`} />
            </>
          ) : (
            <>
              <path d={`M74 ${browY + 4} Q84 ${browY - 1} 94 ${browY + 3}`} />
              <path d={`M102 ${browY + 3} Q112 ${browY - 1} 122 ${browY + 4}`} />
            </>
          )}
        </g>
      )}
      {mood === "wink" && (
        <path
          d={`M102 ${browY + 2} Q112 ${browY - 2} 122 ${browY + 3}`}
          stroke="#1a120c"
          strokeWidth="3.6"
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* Ojos */}
      {mood === "wink" ? (
        <>
          <CartoonEye cx={84} cy={eyeY} rx={eyeRx} ry={eyeRy} closed />
          <CartoonEye
            cx={110}
            cy={eyeY - 2}
            rx={eyeRx + 0.5}
            ry={eyeRy + 1}
            pupilDx={2.5}
            pupilDy={3}
          />
        </>
      ) : (
        <>
          <CartoonEye
            cx={84}
            cy={eyeY}
            rx={eyeRx}
            ry={eyeRy}
            pupilDx={1.5}
            pupilDy={wow ? 0.5 : 2.5}
          />
          <CartoonEye
            cx={110}
            cy={eyeY - 2}
            rx={eyeRx + 0.5}
            ry={eyeRy + 1}
            pupilDx={2.2}
            pupilDy={wow ? 0.5 : 2}
          />
        </>
      )}

      {mouth}
    </svg>
  );
}

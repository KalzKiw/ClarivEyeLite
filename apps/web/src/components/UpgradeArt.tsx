/** Ilustración propia Clariv — operaria con caja (estilo flat, sin copiar assets ajenos). */
export function UpgradeArt({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Círculos de atmósfera */}
      <circle cx="70" cy="210" r="90" fill="#5b21b6" fillOpacity="0.45" />
      <circle cx="200" cy="80" r="70" fill="#6d28d9" fillOpacity="0.35" />
      <circle cx="40" cy="60" r="36" fill="#7c3aed" fillOpacity="0.4" />

      {/* Mesa */}
      <ellipse cx="150" cy="268" rx="110" ry="14" fill="#4c1d95" fillOpacity="0.5" />

      {/* Caja Clariv */}
      <g transform="translate(48 168)">
        <path d="M20 40 L70 20 L120 40 L70 60 Z" fill="#c4b5fd" />
        <path d="M20 40 L20 95 L70 115 L70 60 Z" fill="#8b5cf6" />
        <path d="M70 60 L70 115 L120 95 L120 40 Z" fill="#a78bfa" />
        <path d="M45 50 L70 40 L95 50 L70 60 Z" fill="#f0abfc" fillOpacity="0.9" />
        <rect x="58" y="72" width="24" height="8" rx="2" fill="#fce7f3" />
      </g>

      {/* Persona */}
      <g transform="translate(130 40)">
        {/* Cabello */}
        <ellipse cx="55" cy="48" rx="42" ry="44" fill="#f472b6" />
        <path d="M18 55 Q12 90 28 105 L45 70 Z" fill="#db2777" />
        <path d="M92 55 Q98 90 82 105 L65 70 Z" fill="#db2777" />
        {/* Cara */}
        <ellipse cx="55" cy="58" rx="32" ry="34" fill="#fde68a" />
        {/* Gafas */}
        <circle cx="42" cy="58" r="11" stroke="#1e1b4b" strokeWidth="2.5" fill="none" />
        <circle cx="68" cy="58" r="11" stroke="#1e1b4b" strokeWidth="2.5" fill="none" />
        <path d="M53 58 H57" stroke="#1e1b4b" strokeWidth="2.5" />
        {/* Sonrisa */}
        <path d="M45 72 Q55 80 65 72" stroke="#9a3412" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Cuerpo */}
        <path
          d="M22 105 Q55 95 88 105 L95 190 L15 190 Z"
          fill="#2dd4bf"
        />
        <path d="M40 105 L40 130 L70 130 L70 105" fill="#f8fafc" />
        {/* Brazo + café */}
        <path d="M88 120 Q115 115 118 145" stroke="#fde68a" strokeWidth="14" strokeLinecap="round" />
        <rect x="108" y="140" width="22" height="28" rx="4" fill="#fce7f3" />
        <ellipse cx="119" cy="140" rx="12" ry="5" fill="#f9a8d4" />
        {/* Portátil / pistola scan */}
        <rect x="28" y="148" width="58" height="38" rx="4" fill="#e2e8f0" />
        <rect x="34" y="154" width="46" height="22" rx="2" fill="#312e81" />
        <path d="M55 176 L55 188" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
        <circle cx="55" cy="192" r="3" fill="#f43f5e" />
      </g>
    </svg>
  );
}

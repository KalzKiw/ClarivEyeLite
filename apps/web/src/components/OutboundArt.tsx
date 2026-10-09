import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  /** compact = franja móvil */
  compact?: boolean;
};

/**
 * Ilustración propia: pasillo de salida + haz de scan.
 * Sin foto stock.
 */
export function OutboundArt({ className, compact = false }: Props) {
  const reduce = useReducedMotion();

  return (
    <div className={cn("relative overflow-hidden bg-[hsl(221_55%_28%)]", className)}>
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 30% 40%, hsl(221 83% 53% / 0.55), transparent 70%), radial-gradient(ellipse 50% 40% at 80% 80%, hsl(28 90% 48% / 0.18), transparent 60%)",
        }}
      />

      <svg
        viewBox="0 0 640 720"
        className={cn("relative h-full w-full", compact ? "min-h-[160px] object-cover" : "min-h-full")}
        preserveAspectRatio={compact ? "xMidYMid slice" : "xMidYMid meet"}
        aria-hidden
      >
        {/* suelo / perspectiva */}
        <polygon points="80,720 560,720 420,420 220,420" fill="hsl(221 40% 18% / 0.55)" />
        <line x1="220" y1="420" x2="80" y2="720" stroke="hsl(0 0% 100% / 0.08)" strokeWidth="2" />
        <line x1="420" y1="420" x2="560" y2="720" stroke="hsl(0 0% 100% / 0.08)" strokeWidth="2" />
        <line x1="320" y1="420" x2="320" y2="720" stroke="hsl(0 0% 100% / 0.05)" strokeWidth="1" />

        {/* estanterías izq */}
        <g opacity="0.9">
          <rect x="40" y="180" width="90" height="260" rx="4" fill="hsl(221 35% 22%)" />
          <rect x="52" y="200" width="66" height="40" rx="3" fill="hsl(221 50% 42% / 0.55)" />
          <rect x="52" y="255" width="66" height="40" rx="3" fill="hsl(166 45% 36% / 0.45)" />
          <rect x="52" y="310" width="66" height="40" rx="3" fill="hsl(28 70% 48% / 0.4)" />
          <rect x="52" y="365" width="66" height="40" rx="3" fill="hsl(221 50% 42% / 0.4)" />
        </g>
        {/* estanterías der */}
        <g opacity="0.9">
          <rect x="510" y="180" width="90" height="260" rx="4" fill="hsl(221 35% 22%)" />
          <rect x="522" y="200" width="66" height="40" rx="3" fill="hsl(152 40% 35% / 0.45)" />
          <rect x="522" y="255" width="66" height="40" rx="3" fill="hsl(221 50% 42% / 0.5)" />
          <rect x="522" y="310" width="66" height="40" rx="3" fill="hsl(28 70% 48% / 0.35)" />
          <rect x="522" y="365" width="66" height="40" rx="3" fill="hsl(221 50% 42% / 0.35)" />
        </g>

        {/* cajas en el pasillo */}
        <g>
          <rect x="250" y="480" width="70" height="50" rx="4" fill="hsl(32 45% 62%)" />
          <rect x="255" y="485" width="60" height="8" rx="2" fill="hsl(32 30% 45% / 0.5)" />
          <rect x="330" y="500" width="55" height="42" rx="4" fill="hsl(210 25% 55%)" />
          <rect x="280" y="545" width="80" height="48" rx="4" fill="hsl(28 55% 55%)" />
          <rect x="285" y="550" width="70" height="8" rx="2" fill="hsl(28 40% 40% / 0.45)" />
        </g>

        {/* etiqueta barcode sobre caja */}
        <g transform="translate(290 555)">
          {[0, 4, 7, 9, 13, 15, 19, 22, 24].map((x, i) => (
            <rect
              key={i}
              x={x}
              y={0}
              width={i % 3 === 0 ? 2.5 : 1.5}
              height={14}
              fill="hsl(221 55% 18%)"
            />
          ))}
        </g>

        {/* portal / puerta de muelle al fondo */}
        <rect x="250" y="250" width="140" height="170" rx="6" fill="hsl(221 45% 16% / 0.8)" />
        <rect
          x="262"
          y="262"
          width="116"
          height="146"
          rx="4"
          fill="none"
          stroke="hsl(0 0% 100% / 0.2)"
          strokeWidth="2"
        />
        <text
          x="320"
          y="340"
          textAnchor="middle"
          fill="hsl(0 0% 100% / 0.35)"
          fontSize="14"
          fontFamily="Sora, sans-serif"
          fontWeight="600"
        >
          OUT
        </text>

        {/* haz de scan */}
        {!reduce ? (
          <motion.rect
            x="200"
            width="240"
            height="3"
            rx="1.5"
            fill="hsl(48 98% 58%)"
            initial={{ y: 280, opacity: 0 }}
            animate={{ y: [280, 520, 280], opacity: [0.2, 0.95, 0.2] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
            style={{ filter: "drop-shadow(0 0 8px hsl(48 98% 58% / 0.8))" }}
          />
        ) : (
          <rect
            x="200"
            y="400"
            width="240"
            height="3"
            rx="1.5"
            fill="hsl(48 98% 58% / 0.7)"
          />
        )}

        {/* glow scan */}
        {!reduce ? (
          <motion.rect
            x="200"
            width="240"
            height="48"
            fill="url(#scanGlow)"
            initial={{ y: 256 }}
            animate={{ y: [256, 496, 256] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
            opacity={0.45}
          />
        ) : null}

        <defs>
          <linearGradient id="scanGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(48 98% 58% / 0)" />
            <stop offset="50%" stopColor="hsl(48 98% 58% / 0.35)" />
            <stop offset="100%" stopColor="hsl(48 98% 58% / 0)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const outDir = path.join(publicDir, "icons");

const primary = "#2563eb";
const white = "#ffffff";
const deep = "#0b1f66";

/** Isometric ClarivBox mark (Shell header), scaled into a square canvas */
function markSvg({ size, bg, markFill, edgeLight, edgeDark, inset = 0.18, rounded = true }) {
  const vb = 64;
  const pad = size * inset;
  const box = size - pad * 2;
  const scale = box / vb;
  const ox = pad;
  const oy = pad;
  const stroke = Math.max(1.2, size * 0.012);

  const t = (pts) =>
    pts
      .split(" ")
      .map((p) => {
        const [x, y] = p.split(",").map(Number);
        return `${(ox + x * scale).toFixed(2)},${(oy + y * scale).toFixed(2)}`;
      })
      .join(" ");

  const rx = rounded ? (size * 0.18).toFixed(1) : "0";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="${bg}"/>
  <polygon points="${t("32,6 58,20 58,44 32,58 6,44 6,20")}" fill="${markFill}"/>
  <polygon points="${t("32,6 58,20 32,34 6,20")}" fill="${edgeLight}" opacity="0.35"/>
  <polygon points="${t("32,34 58,20 58,44 32,58")}" fill="${edgeDark}" opacity="0.22"/>
  <polygon points="${t("32,34 6,20 6,44 32,58")}" fill="${edgeDark}" opacity="0.32"/>
  <polyline points="${t("6,20 32,34 58,20")}" fill="none" stroke="${white}" stroke-width="${stroke.toFixed(2)}" opacity="0.85"/>
  <line x1="${(ox + 32 * scale).toFixed(2)}" y1="${(oy + 34 * scale).toFixed(2)}" x2="${(ox + 32 * scale).toFixed(2)}" y2="${(oy + 58 * scale).toFixed(2)}" stroke="${white}" stroke-width="${stroke.toFixed(2)}" opacity="0.7"/>
</svg>`;
}

async function writePng(file, svg) {
  await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, file));
  console.log("wrote", file);
}

fs.mkdirSync(outDir, { recursive: true });

const appIcon = (size) =>
  markSvg({
    size,
    bg: primary,
    markFill: white,
    edgeLight: white,
    edgeDark: deep,
    inset: 0.17,
    rounded: true,
  });

const maskable = (size) =>
  markSvg({
    size,
    bg: primary,
    markFill: white,
    edgeLight: white,
    edgeDark: deep,
    inset: 0.22,
    rounded: false,
  });

await writePng("icon-192-v2.png", appIcon(192));
await writePng("icon-512-v2.png", appIcon(512));
// Apple applies its own mask — full-bleed square, no baked corner radius
await writePng(
  "icon-180-v2.png",
  markSvg({
    size: 180,
    bg: primary,
    markFill: white,
    edgeLight: white,
    edgeDark: deep,
    inset: 0.17,
    rounded: false,
  }),
);
await writePng("icon-512-maskable-v2.png", maskable(512));

await writePng(
  "clarivpack-mark.png",
  markSvg({
    size: 512,
    bg: white,
    markFill: primary,
    edgeLight: white,
    edgeDark: deep,
    inset: 0.12,
    rounded: true,
  }),
);

const favicon = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="14" fill="#2563eb"/>
  <g transform="translate(8 8) scale(0.75)">
    <polygon points="32,6 58,20 58,44 32,58 6,44 6,20" fill="#ffffff"/>
    <polygon points="32,6 58,20 32,34 6,20" fill="#ffffff" opacity="0.35"/>
    <polygon points="32,34 58,20 58,44 32,58" fill="#0b1f66" opacity="0.22"/>
    <polygon points="32,34 6,20 6,44 32,58" fill="#0b1f66" opacity="0.32"/>
    <polyline points="6,20 32,34 58,20" fill="none" stroke="#ffffff" stroke-width="1.8" opacity="0.9"/>
    <line x1="32" y1="34" x2="32" y2="58" stroke="#ffffff" stroke-width="1.8" opacity="0.75"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, "favicon.svg"), favicon);
console.log("wrote favicon.svg");

await sharp(Buffer.from(favicon)).resize(32, 32).png().toFile(path.join(outDir, "favicon-32.png"));
console.log("wrote favicon-32.png");
console.log("done");

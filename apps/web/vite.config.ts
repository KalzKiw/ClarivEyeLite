import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "icons/favicon-32.png",
        "icons/icon-180-v2.png",
        "icons/clarivpack-mark.png",
      ],
      manifest: {
        name: "ClarivPack",
        short_name: "ClarivPack",
        description: "Preparar y sacar pedidos · ClarivScan y picking",
        theme_color: "#2563eb",
        background_color: "#2563eb",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        lang: "es",
        categories: ["business", "productivity"],
        icons: [
          {
            src: "/icons/icon-192-v2.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512-v2.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512-maskable-v2.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        // Precache shell ligero; JS/WASM pesados (OCR, PDF, three) vía runtime cache
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        globPatterns: ["**/*.{css,html,ico,png,svg,woff2,webp}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/assets/"),
            handler: "CacheFirst",
            options: {
              cacheName: "app-assets-cache",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/tesseract\.js@.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "tesseract-cdn-cache",
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@clariveye-lite/domain": path.resolve(__dirname, "../../packages/domain/src/index.ts"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/tesseract.js")) return "tesseract";
          if (id.includes("pdfjs-dist")) return "pdfjs";
          if (id.includes("jspdf") || id.includes("jspdf-autotable")) return "jspdf";
          if (id.includes("node_modules/three") || id.includes("@react-three")) return "three";
          if (id.includes("@zxing")) return "zxing";
        },
      },
    },
  },
  server: { port: 5174 },
});

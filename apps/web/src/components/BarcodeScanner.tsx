import { useEffect, useRef } from "react";
import { createBarcodeReader } from "@/lib/barcode-reader";
import { Button } from "@/components/ui";

export function BarcodeScanner({
  onScan,
  onClose,
}: {
  onScan: (raw: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<ReturnType<typeof createBarcodeReader> | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reader = createBarcodeReader();
    readerRef.current = reader;
    let stream: MediaStream | null = null;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        video.srcObject = stream;
        await video.play();
        await reader.start(video, onScan, stream);
      } catch (err) {
        console.error(err);
      }
    })();

    return () => {
      reader.stop();
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <p className="text-sm font-medium">Escanear barcode / QR</p>
        <Button type="button" variant="ghost" className="border-white/30 text-white" onClick={onClose}>
          Cerrar
        </Button>
      </div>
      <div className="relative mx-auto w-full max-w-lg flex-1 px-4 pb-8">
        <video ref={videoRef} className="h-full w-full rounded-xl object-cover" playsInline muted />
        <div className="pointer-events-none absolute inset-x-10 top-1/3 h-24 rounded-lg border-2 border-primary" />
        <p className="mt-3 text-center text-xs text-white/80">
          Pedido CEL1… o referencia de línea
        </p>
      </div>
    </div>
  );
}

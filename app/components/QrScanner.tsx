'use client';

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

/**
 * Opens the camera and calls onScan(text) the first time a QR code is read.
 * Needs https (or localhost) for camera access — the page offers a typed
 * reference as the fallback.
 */
export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onScanRef = useRef(onScan);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    let lastTick = 0;

    function tick(now: number) {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // ~10 reads a second is plenty and keeps phones cool
      if (video && canvas && video.videoWidth && now - lastTick > 100) {
        lastTick = now;
        const scale = Math.min(1, 640 / video.videoWidth);
        const w = Math.round(video.videoWidth * scale);
        const h = Math.round(video.videoHeight * scale);
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const img = ctx.getImageData(0, 0, w, h);
          const code = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
          if (code?.data) {
            stopped = true;
            stream?.getTracks().forEach((t) => t.stop());
            onScanRef.current(code.data);
            return;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser can’t open the camera here (it needs https). Type the reference instead.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setReady(true);
        raf = requestAnimationFrame(tick);
      } catch {
        setError('Camera access was blocked. Allow the camera for this site in your browser, or type the reference instead.');
      }
    }

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (error) {
    return <div className="rounded-lg bg-warn/10 px-3.5 py-2.5 text-sm text-warn">{error}</div>;
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-ink">
      <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />
      {/* viewfinder corners */}
      <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/70" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
          Starting camera…
        </div>
      )}
    </div>
  );
}

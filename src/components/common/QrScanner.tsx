import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { CameraOff, Keyboard, Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface QrScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onResult: (payload: string) => void;
  title?: string;
}

const PAUSE_AFTER_DETECT_MS = 900;

export const QrScanner: React.FC<QrScannerProps> = ({
  isOpen,
  onClose,
  onResult,
  title = 'Scan QR Code',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const emittedRef = useRef(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [status, setStatus] = useState<'starting' | 'scanning' | 'denied' | 'manual'>('starting');
  const [manualValue, setManualValue] = useState('');
  const [lastScanAt, setLastScanAt] = useState(0);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const detectLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(detectLoop);
      return;
    }
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width && height) {
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (context) {
        context.drawImage(video, 0, 0, width, height);
        const imageData = context.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, width, height, { inversionAttempts: 'dontInvert' });
        if (code?.data) {
          const now = Date.now();
          if (!emittedRef.current && now - lastScanAt > PAUSE_AFTER_DETECT_MS) {
            emittedRef.current = true;
            setLastScanAt(now);
            stopCamera();
            onResult(code.data);
            return;
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(detectLoop);
  }, [lastScanAt, onResult, stopCamera]);

  const startCamera = useCallback(async () => {
    stopCamera();
    emittedRef.current = false;
    setStatus('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setStatus('scanning');
      rafRef.current = requestAnimationFrame(detectLoop);
    } catch {
      setStatus('denied');
    }
  }, [detectLoop, facingMode, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, facingMode]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const value = manualValue.trim();
    if (!value) return;
    stopCamera();
    onResult(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-md overflow-hidden rounded-2xl border-none bg-black p-0 text-white shadow-2xl">
        <DialogHeader className="pointer-events-none absolute left-0 right-0 top-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
          <DialogTitle className="text-center font-bold tracking-wide text-white">{title}</DialogTitle>
        </DialogHeader>

        <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-[#111] sm:aspect-video">
          {status !== 'manual' && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {status === 'scanning' && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-48 w-48 rounded-xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                </div>
              )}

              {status === 'starting' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/50 backdrop-blur-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                  <p className="text-sm text-white/70">Inasha kamera…</p>
                </div>
              )}

              {status === 'denied' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70 px-8 text-center">
                  <CameraOff className="h-8 w-8 text-white/80" />
                  <p className="text-sm text-white/80">
                    Camera unavailable or permission denied. Allow camera access or type the code.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" className="rounded-full" onClick={startCamera}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Retry
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20"
                      onClick={() => setStatus('manual')}
                    >
                      <Keyboard className="mr-2 h-4 w-4" /> Type code
                    </Button>
                  </div>
                </div>
              )}

              <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-around px-10">
                <Button
                  size="icon"
                  variant="ghost"
                  type="button"
                  aria-label="Flip camera"
                  className="h-12 w-12 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-90"
                  onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
                >
                  <RefreshCw className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  type="button"
                  aria-label="Close scanner"
                  className="h-12 w-12 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-90"
                  onClick={handleClose}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </>
          )}

          {status === 'manual' && (
            <form onSubmit={submitManual} className="w-full max-w-xs space-y-3 px-6">
              <p className="text-center text-sm text-white/80">Paste the QR payload</p>
              <Input
                autoFocus
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                placeholder='Maudhui ya QR…'
                className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
              />
              <div className="flex justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20"
                  onClick={() => startCamera()}
                >
                  Back to camera
                </Button>
                <Button type="submit" className="rounded-full" disabled={!manualValue.trim()}>
                  Use code
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

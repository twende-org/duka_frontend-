import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CameraOff, Keyboard, Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { IScannerControls } from '@zxing/browser';
import { useI18n } from '@/lib/i18n';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onResult: (payload: string) => void;
  title?: string;
}

/** QR plus the 1D symbologies printed on phone and accessory boxes. */
const SCANNER_FORMATS = ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf'];

type ScannerEngine = 'native' | 'zxing';

// Resolved lazily so the QR-only flows keep shipping without the ZXing bundle.
let zxingModulePromise: Promise<typeof import('@zxing/browser')> | null = null;
const loadZxing = () => {
  if (!zxingModulePromise) zxingModulePromise = import('@zxing/browser');
  return zxingModulePromise;
};

/**
 * Camera scanner for IMEI capture: decodes QR codes and 1D box barcodes
 * (Code 128, EAN-13/8, UPC-A/E, Code 39, ITF). Uses the browser's native
 * BarcodeDetector when available and falls back to @zxing/browser elsewhere
 * (Firefox, Safari). Same single-shot-per-mount contract as QrScanner — the
 * caller remounts with a fresh key to scan the next box in a run.
 */
export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ isOpen, onClose, onResult, title }) => {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const detectingRef = useRef(false);
  const emittedRef = useRef(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [engine, setEngine] = useState<ScannerEngine | null>(null);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'denied' | 'manual'>('starting');
  const [manualValue, setManualValue] = useState('');

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    detectorRef.current = null;
    detectingRef.current = false;
  }, []);

  const emit = useCallback((value: string) => {
    const code = value.trim();
    if (!code || emittedRef.current) return;
    emittedRef.current = true;
    stopCamera();
    onResult(code);
  }, [onResult, stopCamera]);

  const startNative = useCallback(async () => {
    const Detector = window.BarcodeDetector;
    if (!Detector) throw new Error('BarcodeDetector unavailable');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    await video.play().catch(() => undefined);
    setStatus('scanning');
    detectorRef.current = new Detector({ formats: SCANNER_FORMATS });

    const loop = async () => {
      const detector = detectorRef.current;
      const v = videoRef.current;
      if (!detector || !v || v.readyState !== v.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(() => { void loop(); });
        return;
      }
      if (!detectingRef.current) {
        detectingRef.current = true;
        try {
          const found = await detector.detect(v);
          if (found.length > 0) {
            emit(found[0].rawValue);
            return;
          }
        } catch {
          // A frame can race the video resizing; skip it and keep scanning.
        }
        detectingRef.current = false;
      }
      rafRef.current = requestAnimationFrame(() => { void loop(); });
    };
    void loop();
  }, [emit, facingMode]);

  const startZxing = useCallback(async () => {
    const { BrowserMultiFormatReader } = await loadZxing();
    const video = videoRef.current;
    if (!video) return;
    const reader = new BrowserMultiFormatReader();
    controlsRef.current = await reader.decodeFromConstraints(
      { video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      video,
      (result) => { if (result) emit(result.getText()); },
    );
    setStatus('scanning');
  }, [emit, facingMode]);

  const startCamera = useCallback(async () => {
    stopCamera();
    emittedRef.current = false;
    setStatus('starting');
    try {
      if (engine === 'native') await startNative();
      else if (engine === 'zxing') await startZxing();
    } catch {
      setStatus('denied');
    }
  }, [engine, startNative, startZxing, stopCamera]);

  // One probe on mount picks the engine; the camera starts once it is decided.
  useEffect(() => {
    let cancelled = false;
    const pick = async () => {
      const Detector = window.BarcodeDetector;
      if (Detector?.getSupportedFormats) {
        try {
          const supported = await Detector.getSupportedFormats();
          if (!cancelled && SCANNER_FORMATS.some((f) => supported.includes(f))) {
            setEngine('native');
            return;
          }
        } catch {
          // Probe failed — the constructor path would fail too; use ZXing.
        }
      }
      if (!cancelled) setEngine('zxing');
    };
    void pick();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isOpen || !engine) return;
    startCamera();
    return () => { stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, engine, facingMode]);

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
          <DialogTitle className="text-center font-bold tracking-wide text-white">
            {title ?? t('serials.scanTitle')}
          </DialogTitle>
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

              {status === 'scanning' && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-40 w-64 rounded-xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                </div>
              )}

              {status === 'starting' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/50 backdrop-blur-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                  <p className="text-sm text-white/70">{t('scanner.starting')}</p>
                </div>
              )}

              {status === 'denied' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70 px-8 text-center">
                  <CameraOff className="h-8 w-8 text-white/80" />
                  <p className="text-sm text-white/80">{t('scanner.denied')}</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="rounded-full" onClick={startCamera}>
                      <RefreshCw className="mr-2 h-4 w-4" /> {t('scanner.retry')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20"
                      onClick={() => setStatus('manual')}
                    >
                      <Keyboard className="mr-2 h-4 w-4" /> {t('scanner.typeCode')}
                    </Button>
                  </div>
                </div>
              )}

              <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-around px-10">
                <Button
                  size="icon"
                  variant="ghost"
                  type="button"
                  aria-label={t('scanner.flip')}
                  className="h-12 w-12 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-90"
                  onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
                >
                  <RefreshCw className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  type="button"
                  aria-label={t('scanner.close')}
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
              <p className="text-center text-sm text-white/80">{t('scanner.manualHint')}</p>
              <Input
                autoFocus
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                placeholder={t('scanner.manualPlaceholder')}
                className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
              />
              <div className="flex justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20"
                  onClick={() => startCamera()}
                >
                  {t('scanner.backToCamera')}
                </Button>
                <Button type="submit" className="rounded-full" disabled={!manualValue.trim()}>
                  {t('scanner.useCode')}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

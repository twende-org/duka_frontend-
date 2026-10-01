import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RefreshCw, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader } from "@/components/common/Loader";


interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  title?: string;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ 
  isOpen, 
  onClose, 
  onCapture,
  title = "Piga Picha"
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isStarting, setIsStarting] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setIsStarting(true);
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    } finally {
      setIsStarting(false);
    }
  }, [facingMode]);

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, startCamera, capturedImage]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Use video natural dimensions to maintain aspect ratio
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        // Handle mirroring if using front camera
        if (facingMode === 'user') {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Reset transform
        if (facingMode === 'user') {
          context.setTransform(1, 0, 0, 1, 0, 0);
        }
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
        
        // Stop stream to save battery/resource after capture
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
      // Clean up state
      setCapturedImage(null);
    }
  };

  const toggleFacingMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black text-white border-none rounded-2xl shadow-2xl">
        <DialogHeader className="p-4 absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <DialogTitle className="text-white text-center font-bold tracking-wide">{title}</DialogTitle>
        </DialogHeader>

        <div className="relative aspect-[3/4] sm:aspect-video bg-[#111] flex items-center justify-center overflow-hidden">
          {!capturedImage ? (
            <>
              {isStarting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-10 backdrop-blur-sm">
                  <Loader size={40} />
                  <p className="text-sm text-white/70 animate-pulse">Inasha kamera...</p>
                </div>
              )}
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute bottom-8 left-0 right-0 flex items-center justify-around px-10 z-20">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  type="button"
                  className="rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 h-14 w-14 backdrop-blur-md transition-all active:scale-90"
                  onClick={toggleFacingMode}
                >
                  <RefreshCw className="h-7 w-7" />
                </Button>
                
                <button 
                  type="button"
                  onClick={capturePhoto}
                  className="h-20 w-20 rounded-full border-[6px] border-white/30 flex items-center justify-center group active:scale-90 transition-all shadow-xl"
                >
                  <div className="h-14 w-14 rounded-full bg-white group-hover:bg-white/90 group-active:bg-primary transition-all shadow-inner" />
                </button>

                <Button 
                  size="icon" 
                  variant="ghost" 
                  type="button"
                  className="rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 h-14 w-14 backdrop-blur-md transition-all active:scale-90"
                  onClick={onClose}
                >
                  <X className="h-7 w-7" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-300" />
              <div className="absolute bottom-8 left-0 right-0 flex items-center justify-around px-10 z-20">
                <Button 
                  type="button"
                  variant="outline" 
                  className="rounded-full bg-white/10 hover:bg-white/20 text-white border-white/30 h-14 px-8 backdrop-blur-md font-semibold transition-all active:scale-90"
                  onClick={handleRetake}
                >
                  <RefreshCw className="h-5 w-5 mr-3" /> Rudia
                </Button>
                
                <Button 
                  type="button"
                  className="rounded-full bg-primary hover:bg-primary/90 text-white h-14 px-10 font-bold shadow-lg shadow-primary/30 transition-all active:scale-90"
                  onClick={handleConfirm}
                >
                  <Check className="h-6 w-6 mr-3" /> Tumia Picha
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

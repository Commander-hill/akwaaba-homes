'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, CheckCircle2, ShieldCheck, PenTool } from 'lucide-react';

interface SignaturePadProps {
  onSave: (base64Signature: string) => void;
  label?: string;
  disabled?: boolean;
}

export default function SignaturePad({ onSave, label = 'Sign Below', disabled = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const width = container.clientWidth || 500;
    const height = 180;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#0F5132'; // Ghanaian Forest Emerald ink
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    initCanvas();

    const handleResize = () => {
      // Re-init on window resize
      if (!hasSigned) {
        initCanvas();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initCanvas, hasSigned]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasSigned(true);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      setHasSigned(false);
    }
  };

  const confirmSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSigned) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="space-y-3" ref={containerRef}>
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
          {label}
        </label>
        {hasSigned && !disabled && (
          <button
            type="button"
            onClick={clearCanvas}
            className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Eraser className="w-3.5 h-3.5" /> Clear Signature
          </button>
        )}
      </div>

      <div className="relative rounded-2xl border-2 border-dashed border-emerald-600/30 dark:border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 overflow-hidden shadow-inner">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`w-full touch-none cursor-crosshair ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {!hasSigned && !disabled && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-xs font-semibold text-slate-400 dark:text-slate-500 select-none space-y-1">
            <span className="text-base">✍️</span>
            <span>Sign with stylus, touch, or mouse inside the box</span>
            <span className="text-[10px] text-slate-400">High-DPI Retina Stroke Stabilizer Active</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span className="flex items-center gap-1 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
          Act 772 Statutory E-Signature Canvas
        </span>
        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
          {hasSigned ? '✓ Signature Captured' : 'Awaiting Input'}
        </span>
      </div>

      {hasSigned && !disabled && (
        <button
          type="button"
          onClick={confirmSignature}
          className="w-full py-3 px-4 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
        >
          <CheckCircle2 className="w-4 h-4 text-amber-300" /> Confirm & Attach E-Signature
        </button>
      )}
    </div>
  );
}

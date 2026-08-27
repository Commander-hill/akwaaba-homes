'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Eraser, CheckCircle2, RotateCcw } from 'lucide-react';

interface SignaturePadProps {
  onSave: (base64Signature: string) => void;
  label?: string;
  disabled?: boolean;
}

export default function SignaturePad({ onSave, label = 'Sign Below', disabled = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high resolution & smooth line rendering
    canvas.width = canvas.parentElement?.clientWidth || 500;
    canvas.height = 180;
    ctx.strokeStyle = '#1e1b4b'; // Dark Indigo ink
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
          {label}
        </label>
        {hasSigned && !disabled && (
          <button
            type="button"
            onClick={clearCanvas}
            className="text-xs font-semibold text-red-500 hover:text-red-600 flex items-center gap-1"
          >
            <Eraser className="w-3.5 h-3.5" /> Clear Signature
          </button>
        )}
      </div>

      <div className="relative rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-slate-900/60 overflow-hidden">
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
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs font-semibold text-slate-400 dark:text-slate-600">
            ✍️ Sign using mouse, finger, or stylus
          </div>
        )}
      </div>

      {hasSigned && !disabled && (
        <button
          type="button"
          onClick={confirmSignature}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
        >
          <CheckCircle2 className="w-4 h-4" /> Confirm & Attach E-Signature
        </button>
      )}
    </div>
  );
}

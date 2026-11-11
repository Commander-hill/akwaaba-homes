'use client';

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import {
  Upload,
  X,
  CheckCircle2,
  Camera,
  User,
  Loader2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Crop,
  Move,
  Check
} from 'lucide-react';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import AlertBanner from '@/components/AlertBanner';

interface PassportUploadProps {
  onUploadSuccess: (url: string) => void;
  onUploadError?: (error: string) => void;
  currentUrl?: string;
  label?: string;
  description?: string;
  optional?: boolean;
  required?: boolean;
}

const VIEWPORT_SIZE = 260;
const OUTPUT_SIZE = 800;

export default function PassportUpload({
  onUploadSuccess,
  onUploadError,
  currentUrl,
  label = 'Profile Photo',
  description = 'Clear portrait or passport-style photo. Frame, zoom, and crop before upload.',
  optional = false,
  required = true,
}: PassportUploadProps) {
  const uploadId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ? getImageUrl(currentUrl) : null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Interactive Crop Modal State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [rawFileName, setRawFileName] = useState<string>('avatar.webp');
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 1, height: 1 });
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  });
  const cropImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (currentUrl) {
      setPreview(getImageUrl(currentUrl));
    } else {
      setPreview(null);
    }
  }, [currentUrl]);

  // Clean up rawImageSrc blob URL on unmount
  useEffect(() => {
    return () => {
      if (rawImageSrc && rawImageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(rawImageSrc);
      }
    };
  }, [rawImageSrc]);

  const openCropModalWithFile = (file: File) => {
    setError(null);
    if (onUploadError) onUploadError('');

    if (!file.type.startsWith('image/')) {
      const err = 'Please upload a valid image file (JPG, PNG, or WebP).';
      setError(err);
      if (onUploadError) onUploadError(err);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      const err = 'Image file is too large. Maximum size is 10MB.';
      setError(err);
      if (onUploadError) onUploadError(err);
      return;
    }

    if (rawImageSrc && rawImageSrc.startsWith('blob:')) {
      URL.revokeObjectURL(rawImageSrc);
    }

    const objectUrl = URL.createObjectURL(file);
    setRawImageSrc(objectUrl);
    setRawFileName(file.name.replace(/\.[^/.]+$/, '') + '.webp');
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setIsCropModalOpen(true);
  };

  // Calculate base cover scale so image always fills the square viewport at zoom = 1
  const getBaseCoverScale = useCallback(() => {
    const isRotated90 = rotation % 180 !== 0;
    const effW = isRotated90 ? naturalSize.height : naturalSize.width;
    const effH = isRotated90 ? naturalSize.width : naturalSize.height;
    if (!effW || !effH) return 1;
    return Math.max(VIEWPORT_SIZE / effW, VIEWPORT_SIZE / effH);
  }, [naturalSize, rotation]);

  // Clamp pan offsets so the image never leaves empty gaps inside the crop viewport
  const clampPan = useCallback(
    (nextX: number, nextY: number, currentZoom = zoom, currentRotation = rotation) => {
      const isRotated90 = currentRotation % 180 !== 0;
      const effW = isRotated90 ? naturalSize.height : naturalSize.width;
      const effH = isRotated90 ? naturalSize.width : naturalSize.height;
      const baseScale = Math.max(VIEWPORT_SIZE / (effW || 1), VIEWPORT_SIZE / (effH || 1));
      const renderedW = effW * baseScale * currentZoom;
      const renderedH = effH * baseScale * currentZoom;

      const maxOffsetX = Math.max(0, (renderedW - VIEWPORT_SIZE) / 2);
      const maxOffsetY = Math.max(0, (renderedH - VIEWPORT_SIZE) / 2);

      return {
        x: Math.min(maxOffsetX, Math.max(-maxOffsetX, nextX)),
        y: Math.min(maxOffsetY, Math.max(-maxOffsetY, nextY)),
      };
    },
    [naturalSize, zoom, rotation]
  );

  const handleZoomChange = (nextZoom: number) => {
    const clampedZoom = Math.min(3, Math.max(1, Number(nextZoom.toFixed(2))));
    setZoom(clampedZoom);
    setPan((prev) => clampPan(prev.x, prev.y, clampedZoom, rotation));
  };

  const handleRotate = () => {
    const nextRotation = (rotation + 90) % 360;
    setRotation(nextRotation);
    setPan((prev) => clampPan(prev.x, prev.y, zoom, nextRotation));
  };

  const handleResetCrop = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Pointer / Touch Drag Handlers
  const startDrag = (clientX: number, clientY: number) => {
    setIsPanning(true);
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const moveDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!isPanning) return;
      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;
      setPan(clampPan(dragStartRef.current.panX + dx, dragStartRef.current.panY + dy));
    },
    [isPanning, clampPan]
  );

  const endDrag = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    if (!isPanning) return;
    const onMouseMove = (e: MouseEvent) => moveDrag(e.clientX, e.clientY);
    const onMouseUp = () => endDrag();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => endDrag();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isPanning, moveDrag, endDrag]);

  const uploadFileToServer = async (file: File) => {
    setError(null);
    if (onUploadError) onUploadError('');

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await api.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = response.data;
      const uploadedUrl = data.url || data.avatarUrl;
      const fullUrl = getImageUrl(uploadedUrl);
      setPreview(fullUrl);
      onUploadSuccess(uploadedUrl);
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to upload profile picture. Please try again.';
      setError(msg);
      if (onUploadError) onUploadError(msg);
      setPreview(currentUrl ? getImageUrl(currentUrl) : null);
    } finally {
      setIsUploading(false);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    }
  };

  const handleApplyCropAndUpload = async () => {
    const imgEl = cropImageRef.current;
    if (!imgEl) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Ratio between output canvas (800px) and interactive viewport (260px)
      const ratio = OUTPUT_SIZE / VIEWPORT_SIZE;
      const baseScale = getBaseCoverScale();
      const totalScale = baseScale * zoom * ratio;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      ctx.save();
      // Translate to center of 800x800 canvas + scaled user pan offset
      ctx.translate(OUTPUT_SIZE / 2 + pan.x * ratio, OUTPUT_SIZE / 2 + pan.y * ratio);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(totalScale, totalScale);
      ctx.drawImage(imgEl, -naturalSize.width / 2, -naturalSize.height / 2, naturalSize.width, naturalSize.height);
      ctx.restore();

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/webp', 0.92)
      );

      if (!blob) {
        throw new Error('Could not process cropped image.');
      }

      const croppedFile = new File([blob], rawFileName || 'avatar.webp', { type: 'image/webp' });
      setIsCropModalOpen(false);
      await uploadFileToServer(croppedFile);
    } catch (e: any) {
      setError(e?.message || 'Failed to crop image.');
      setIsCropModalOpen(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      openCropModalWithFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      openCropModalWithFile(e.target.files[0]);
      // Reset input so selecting the same file again still triggers onChange
      e.target.value = '';
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setError(null);
    onUploadSuccess('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const baseScale = getBaseCoverScale();

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        id={`${uploadId}-file`} name="passportPhoto" aria-label={label} accept="image/png, image/jpeg, image/jpg, image/webp"
        onChange={handleFileSelect}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-2xl border transition-all p-4 ${
          isDragging
            ? 'border-[#16A34A] bg-[#16A34A]/10 ring-2 ring-[#16A34A]/30'
            : 'border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          {/* Avatar Circular Preview / Drop Area */}
          <div className="relative shrink-0">
            <div
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`relative w-24 h-24 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 transition-all cursor-pointer flex items-center justify-center shadow-xs group ${
                preview
                  ? 'border-[#16A34A] dark:border-emerald-500'
                  : 'border-dashed border-zinc-300 dark:border-zinc-700 hover:border-[#16A34A] bg-white dark:bg-zinc-800/80'
              }`}
            >
              {preview ? (
                <>
                  <img decoding="async"
                    src={preview}
                    alt="Profile Preview"
                    className="w-full h-full object-cover"
                    onError={() => {
                      setPreview(null);
                    }}
                  />
                  {/* Hover Overlay */}
                  {!isUploading && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold">
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span>Change</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 group-hover:text-[#16A34A] transition-colors">
                  <User className="w-8 h-8" />
                  <span className="text-[10px] font-bold mt-1 text-zinc-500 dark:text-zinc-400 group-hover:text-[#16A34A]">
                    Upload
                  </span>
                </div>
              )}

              {/* Uploading Spinner Overlay */}
              {isUploading && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-2xs text-white">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <span className="text-[9px] font-mono font-bold mt-1">Uploading</span>
                </div>
              )}
            </div>

            {/* Success check badge */}
            {preview && !isUploading && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#16A34A] text-white flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          {/* Details & Action Controls */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="text-xs font-bold text-zinc-950 dark:text-white">
                {label}
              </span>
              {optional && !required ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                  Optional
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-100/90 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/60 shadow-2xs">
                  Required *
                </span>
              )}
              {preview && !isUploading && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16A34A] dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Cropped &amp; optimized
                </span>
              )}
            </div>

            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-sm">
              {description}
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="h-8 px-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-[#16A34A] dark:hover:border-emerald-500 text-zinc-800 dark:text-zinc-200 text-[11px] font-bold inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {preview ? (
                  <>
                    <RotateCcw className="w-3 h-3 text-[#16A34A]" />
                    <span>Change Photo</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3 h-3 text-[#16A34A]" />
                    <span>Choose Photo</span>
                  </>
                )}
              </button>

              {rawImageSrc && preview && !isUploading && (
                <button
                  type="button"
                  onClick={() => setIsCropModalOpen(true)}
                  className="h-8 px-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 hover:border-[#16A34A] text-[#0F5132] dark:text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Crop className="w-3 h-3" />
                  <span>Adjust Crop</span>
                </button>
              )}

              {preview && !isUploading && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="h-8 px-2.5 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              )}

              <span className="text-[10px] text-zinc-600 dark:text-zinc-300 font-mono self-center">
                JPG, PNG, WebP up to 10MB
              </span>
            </div>
          </div>
        </div>

        {error && (
          <AlertBanner
            type="error"
            message={error}
            className="mt-3"
          />
        )}
      </div>

      {/* ──── Interactive Avatar Crop & Zoom Modal ──── */}
      {isCropModalOpen && rawImageSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setIsCropModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#0F5132] dark:text-emerald-400">
                  <Crop className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-950 dark:text-white">
                    Frame &amp; Crop Portrait Photo
                  </h3>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Drag to center your face inside the circular passport guide
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive Viewport */}
            <div className="p-5 flex flex-col items-center bg-zinc-950/95 relative select-none">
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  startDrag(e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  if (e.touches.length > 0) {
                    startDrag(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
                className={`relative overflow-hidden rounded-xl bg-zinc-900 flex items-center justify-center ${
                  isPanning ? 'cursor-grabbing' : 'cursor-grab'
                }`}
              >
                <img decoding="async"
                  ref={cropImageRef}
                  src={rawImageSrc}
                  alt="Crop source"
                  draggable={false}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setNaturalSize({
                      width: img.naturalWidth || 1,
                      height: img.naturalHeight || 1,
                    });
                  }}
                  style={{
                    width: naturalSize.width,
                    height: naturalSize.height,
                    maxWidth: 'none',
                    maxHeight: 'none',
                    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) rotate(${rotation}deg) scale(${
                      baseScale * zoom
                    })`,
                    transformOrigin: 'center center',
                  }}
                  className="pointer-events-none select-none transition-transform duration-75 ease-out"
                />

                {/* Circular Passport Framing Mask Overlay */}
                <div
                  className="absolute inset-0 pointer-events-none rounded-full border-2 border-emerald-400/90"
                  style={{
                    boxShadow: '0 0 0 9999px rgba(9, 9, 11, 0.62)',
                  }}
                />

                {/* Subtle Rule-of-Thirds Alignment Crosshair when dragging */}
                {isPanning && (
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-white/20" />
                    <div className="border-r border-white/20" />
                    <div />
                  </div>
                )}
              </div>

              <div className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                <Move className="w-3 h-3 text-emerald-400" />
                <span>Drag photo to reposition • Output: 800×800 HD WebP</span>
              </div>
            </div>

            {/* Zoom & Rotation Controls */}
            <div className="px-5 py-4 space-y-3 bg-zinc-50/70 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleZoomChange(zoom - 0.15)}
                  disabled={zoom <= 1}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-[#16A34A] disabled:opacity-40 cursor-pointer"
                  title="Zoom out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={3}
                    id={`${uploadId}-zoom`} name="zoom" aria-label="Zoom level" step={0.02}
                    value={zoom}
                    onChange={(e) => handleZoomChange( parseFloat(e.target.value) )}
                    className="w-full accent-[#16A34A] cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg"
                  />
                  <span className="text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-300 w-11 text-right">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleZoomChange(zoom + 0.15)}
                  disabled={zoom >= 3}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-[#16A34A] disabled:opacity-40 cursor-pointer"
                  title="Zoom in"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-[#16A34A] cursor-pointer"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleResetCrop}
                  className="px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-300 hover:border-[#16A34A] cursor-pointer"
                  title="Reset zoom and position"
                >
                  Reset
                </button>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-200/70 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCropModalOpen(false)}
                  className="h-9 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyCropAndUpload}
                  className="h-9 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply Crop &amp; Upload</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


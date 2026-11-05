'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, CheckCircle2, Camera, User, Loader2, RotateCcw } from 'lucide-react';
import Image from 'next/image';
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
}

export default function PassportUpload({
  onUploadSuccess,
  onUploadError,
  currentUrl,
  label = 'Profile Photo',
  description = 'Clear portrait or passport-style photo. Centered and cropped automatically.',
  optional = true,
}: PassportUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ? getImageUrl(currentUrl) : null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUrl) {
      setPreview(getImageUrl(currentUrl));
    } else {
      setPreview(null);
    }
  }, [currentUrl]);

  const validateAndUpload = async (file: File) => {
    setError(null);
    if (onUploadError) onUploadError('');

    // Client-side validation: File Type
    if (!file.type.startsWith('image/')) {
      const err = 'Please upload a valid image file (JPG, PNG, or WebP).';
      setError(err);
      if (onUploadError) onUploadError(err);
      return;
    }

    // Client-side validation: Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      const err = 'Image file is too large. Maximum size is 10MB.';
      setError(err);
      if (onUploadError) onUploadError(err);
      return;
    }

    // Create an instant local blob preview for immediate feedback
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
      // Revert preview if currentUrl exists, otherwise clear
      setPreview(currentUrl ? getImageUrl(currentUrl) : null);
    } finally {
      setIsUploading(false);
      // Clean up object URL if it was created
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
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
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setError(null);
    onUploadSuccess('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/png, image/jpeg, image/jpg, image/webp"
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
                  <img
                    src={preview}
                    alt="Profile Preview"
                    className="w-full h-full object-cover"
                    onError={() => {
                      // If currentUrl was invalid or failed to load, clear preview
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
              {optional && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                  Optional
                </span>
              )}
              {preview && !isUploading && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16A34A] dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Photo attached
                </span>
              )}
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm">
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

              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono self-center">
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
    </div>
  );
}

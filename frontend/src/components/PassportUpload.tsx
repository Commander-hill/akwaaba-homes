'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Camera } from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';

interface PassportUploadProps {
  onUploadSuccess: (url: string) => void;
  onUploadError: (error: string) => void;
  currentUrl?: string;
}

export default function PassportUpload({ onUploadSuccess, onUploadError, currentUrl }: PassportUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ? getImageUrl(currentUrl) : null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndUpload = async (file: File) => {
    setError(null);
    onUploadError(''); // Clear parent error

    // Client-side validation: Type
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      onUploadError('Please upload a valid image file.');
      return;
    }

    // Client-side validation: Size (Max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB.');
      onUploadError('Image must be less than 2MB.');
      return;
    }

    // Client-side validation: Dimensions and Aspect Ratio
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = async () => {
        const width = img.width;
        const height = img.height;

        if (width < 200 || height < 200) {
          const err = 'Image is too small. Minimum size is 200x200 pixels.';
          setError(err);
          onUploadError(err);
          return;
        }

        const ratio = width / height;
        const isSquare = ratio >= 0.95 && ratio <= 1.05;
        const isPassport = ratio >= 0.72 && ratio <= 0.78;

        if (!isSquare && !isPassport) {
          const err = 'Picture must be a square (1:1) or standard passport size (3:4 aspect ratio).';
          setError(err);
          onUploadError(err);
          return;
        }

        // Show preview immediately
        setPreview(e.target?.result as string);

        // Proceed to upload
        setIsUploading(true);
        const formData = new FormData();
        formData.append('avatar', file);

        try {
          const response = await api.post('/upload/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          const data = response.data;
          const uploadedUrl = data.url || data.avatarUrl;
          const fullUrl = getImageUrl(uploadedUrl);
          setPreview(fullUrl);
          onUploadSuccess(uploadedUrl);
        } catch (err: any) {
          const msg = err.response?.data?.message || err.message || 'An error occurred during upload.';
          setError(msg);
          onUploadError(msg);
          setPreview(null);
        } finally {
          setIsUploading(false);
        }
      };
      img.onerror = () => {
        setError('Failed to read image.');
        onUploadError('Failed to read image.');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
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

  return (
    <div className="w-full">
      <div 
        className={`relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all ${
          isDragging ? 'border-[#5B4CFF] bg-[#5B4CFF]/5' : error ? 'border-red-500/50 bg-red-500/5' : preview ? 'border-white/10 bg-[#1C1A1B]/40' : 'border-white/20 bg-[#2A2A2B]/40 hover:bg-[#2A2A2B]/60 hover:border-white/30'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !preview && !isUploading && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/png, image/jpeg, image/webp" 
          onChange={handleFileSelect}
        />

        {preview ? (
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-[#5B4CFF] shadow-[0_0_20px_rgba(91,76,255,0.3)] group">
            <Image src={preview} alt="Passport Preview" fill className="object-cover" />
            
            {/* Loading Overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            
            {/* Change Image Overlay */}
            {!isUploading && (
              <div 
                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreview(null);
                  setError(null);
                  onUploadSuccess('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                <X className="text-white w-8 h-8" />
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
              error ? 'bg-red-500/20 text-red-400' : 'bg-[#5B4CFF]/20 text-[#5B4CFF]'
            }`}>
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Upload Passport Picture <span className="text-xs font-normal text-[#A1A1AA]">(Optional)</span></h3>
            <p className="text-sm text-[#A1A1AA] max-w-xs mb-4">
              Drag and drop your image here, or click to browse.
            </p>
            <div className="flex gap-2 text-xs text-[#71717A] bg-[#111111]/50 py-2 px-4 rounded-xl">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500"/> 1:1 or 3:4 Ratio</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500"/> Max 2MB</span>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 text-sm font-medium text-red-400 flex items-center gap-2 justify-center">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
    </div>
  );
}

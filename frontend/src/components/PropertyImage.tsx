'use client';

import React, { useState } from 'react';
import { getImageUrl } from '@/lib/imageUrl';
import Image from 'next/image';
import { Building2 } from 'lucide-react';
import clsx from 'clsx';

interface PropertyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt: string;
  fallbackIconClassName?: string;
  priority?: boolean;
}

export default function PropertyImage({
  src,
  alt,
  className,
  fallbackIconClassName = 'w-8 h-8 text-zinc-400 dark:text-zinc-600',
  priority = false,
  ...props
}: PropertyImageProps) {
  const [hasError, setHasError] = useState(false);
  const resolvedUrl = src && !hasError ? getImageUrl(src) : '';

  if (!resolvedUrl || hasError) {
    return (
      <div 
        className={clsx(
          "w-full h-full flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 select-none",
          className
        )}
      >
        <Building2 className={fallbackIconClassName} />
        <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 mt-1 uppercase tracking-wider">
          No Photo Available
        </span>
      </div>
    );
  }

  if (priority) {
    return (
      <Image
        src={resolvedUrl}
        alt={alt}
        fill
        priority
        fetchPriority="high"

        sizes="(max-width: 640px) 92vw, (max-width: 1280px) 45vw, 320px"
        className={className}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <img
      decoding="async"
      src={resolvedUrl}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      loading="lazy"
      fetchPriority="low"
      {...props}
    />
  );
}

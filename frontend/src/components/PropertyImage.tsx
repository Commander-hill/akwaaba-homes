'use client';

import React, { useState } from 'react';
import { getImageUrl } from '@/lib/utils';
import { Building2 } from 'lucide-react';
import clsx from 'clsx';

interface PropertyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt: string;
  fallbackIconClassName?: string;
}

export default function PropertyImage({
  src,
  alt,
  className,
  fallbackIconClassName = 'w-8 h-8 text-zinc-400 dark:text-zinc-600',
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

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      loading="lazy"
      {...props}
    />
  );
}

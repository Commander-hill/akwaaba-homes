import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  
  // Get base API URL and strip /api/v1 or /api from the tail to obtain the backend host root
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  const rootUrl = apiUrl.replace(/\/api(\/v1)?\/?$/, '').replace(/\/$/, '');

  // Normalize legacy /api/upload paths to /api/v1/upload
  const normalizedPath = url.startsWith('/api/upload')
    ? url.replace('/api/upload', '/api/v1/upload')
    : url;
  
  return `${rootUrl}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
};


import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export { getImageUrl } from './imageUrl';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

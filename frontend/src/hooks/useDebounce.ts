import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce any value (e.g. search input).
 * 
 * Prevents rapid subsequent API calls while typing, reducing server strain
 * and unnecessary database index scans.
 * 
 * @param value The value to debounce (e.g. search string)
 * @param delay Milliseconds to wait before updating (default: 350ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

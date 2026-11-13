'use client';

import { useState, useRef, useCallback } from 'react';

interface UseSwipeToDismissOptions {
  onDismiss: () => void;
  disabled?: boolean;
  thresholdPx?: number;
}

export function useSwipeToDismiss({
  onDismiss,
  disabled = false,
  thresholdPx = 90,
}: UseSwipeToDismissOptions) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const onTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (disabled) return;
      const target = e.currentTarget;
      // Do not intercept swipe if inner content is scrolled down
      if (target.scrollTop > 2) return;
      startYRef.current = e.touches[0].clientY;
      startTimeRef.current = Date.now();
      setIsDragging(true);
    },
    [disabled],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (disabled || startYRef.current === null) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta > 0) {
        setDragY(delta);
      } else {
        setDragY(0);
      }
    },
    [disabled],
  );

  const onTouchEnd = useCallback(() => {
    if (startYRef.current === null) return;
    const elapsed = Math.max(1, Date.now() - startTimeRef.current);
    const velocity = dragY / elapsed; // px/ms

    if (!disabled && (dragY >= thresholdPx || (dragY > 36 && velocity > 0.5))) {
      setDragY(0);
      setIsDragging(false);
      startYRef.current = null;
      onDismiss();
      return;
    }

    setDragY(0);
    setIsDragging(false);
    startYRef.current = null;
  }, [disabled, dragY, thresholdPx, onDismiss]);

  const sheetStyle: React.CSSProperties =
    dragY > 0
      ? {
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }
      : {
          transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        };

  return {
    dragHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    sheetStyle,
    isDragging,
  };
}

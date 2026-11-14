'use client';

import { useState, useRef, useCallback } from 'react';

interface UseSwipeToDismissOptions {
  onDismiss: () => void;
  disabled?: boolean;
  thresholdPx?: number;
}

/**
 * Checks whether the target or any of its scrollable ancestors up to boundary
 * is currently scrolled down (scrollTop > 2) or has active scroll offset.
 * Protects against iOS WebKit momentum inertia rubber-banding and Android Chrome nested scrolling.
 */
function isAnyAncestorScrolled(target: HTMLElement | null, boundary: HTMLElement | null): boolean {
  let curr: HTMLElement | null = target;
  while (curr && curr !== boundary && curr !== document.body) {
    if (curr.scrollTop > 2) {
      return true;
    }
    curr = curr.parentElement;
  }
  if (boundary && boundary.scrollTop > 2) {
    return true;
  }
  return false;
}

export function useSwipeToDismiss({
  onDismiss,
  disabled = false,
  thresholdPx = 90,
}: UseSwipeToDismissOptions) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const isGestureLockedRef = useRef<boolean>(false);

  const onTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (disabled) return;
      if (e.touches.length !== 1) return;

      const target = e.target as HTMLElement;
      const currentTarget = e.currentTarget;

      // Disallow dragging if target or any ancestor has vertical scroll offset
      if (isAnyAncestorScrolled(target, currentTarget)) {
        isGestureLockedRef.current = true;
        return;
      }

      isGestureLockedRef.current = false;
      startXRef.current = e.touches[0].clientX;
      startYRef.current = e.touches[0].clientY;
      startTimeRef.current = Date.now();
      setIsDragging(false);
    },
    [disabled],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (disabled || isGestureLockedRef.current || startYRef.current === null || startXRef.current === null) {
        return;
      }

      const touch = e.touches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;

      // Check if gesture is predominantly horizontal (e.g. text selection, horizontal carousel)
      if (!isDragging && Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isGestureLockedRef.current = true;
        return;
      }

      // If user is swiping upward, do not drag sheet (allow normal vertical page scroll)
      if (deltaY <= 0) {
        setDragY(0);
        setIsDragging(false);
        return;
      }

      // Secondary check: ensure inner elements haven't scrolled during touch movement
      const target = e.target as HTMLElement;
      const currentTarget = e.currentTarget;
      if (isAnyAncestorScrolled(target, currentTarget)) {
        setDragY(0);
        setIsDragging(false);
        isGestureLockedRef.current = true;
        return;
      }

      // Apply resistance when pulled beyond threshold for native spring physics feel
      let effectiveY = deltaY;
      if (deltaY > thresholdPx) {
        const excess = deltaY - thresholdPx;
        effectiveY = thresholdPx + Math.pow(excess, 0.8);
      }

      setIsDragging(true);
      setDragY(effectiveY);
    },
    [disabled, isDragging, thresholdPx],
  );

  const onTouchEnd = useCallback(() => {
    if (startYRef.current === null || isGestureLockedRef.current) {
      setDragY(0);
      setIsDragging(false);
      startYRef.current = null;
      startXRef.current = null;
      isGestureLockedRef.current = false;
      return;
    }

    const elapsed = Math.max(1, Date.now() - startTimeRef.current);
    const velocity = dragY / elapsed; // px/ms

    // Trigger dismissal if crossed threshold or fast flick downward (> 0.5 px/ms with >= 36px displacement)
    if (!disabled && (dragY >= thresholdPx || (dragY > 36 && velocity > 0.5))) {
      setDragY(0);
      setIsDragging(false);
      startYRef.current = null;
      startXRef.current = null;
      onDismiss();
      return;
    }

    setDragY(0);
    setIsDragging(false);
    startYRef.current = null;
    startXRef.current = null;
  }, [disabled, dragY, thresholdPx, onDismiss]);

  const sheetStyle: React.CSSProperties = {
    transform: dragY > 0 ? `translate3d(0, ${dragY}px, 0)` : undefined,
    transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
    touchAction: isDragging ? 'none' : 'pan-x pan-y',
    overscrollBehaviorY: 'contain',
    WebkitOverflowScrolling: 'touch',
    willChange: isDragging ? 'transform' : 'auto',
  };

  return {
    dragHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
    sheetStyle,
    isDragging,
  };
}

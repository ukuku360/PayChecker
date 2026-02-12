import { useRef, useCallback, useState } from 'react';

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
}

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance in px to trigger swipe (default: 50)
  velocityThreshold?: number; // Minimum velocity in px/ms (default: 0.3)
  preventScroll?: boolean; // Prevent vertical scroll during horizontal swipe
}

interface UseSwipeReturn {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

/**
 * Hook for detecting swipe gestures on touch devices
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  velocityThreshold = 0.3,
  preventScroll = false,
}: UseSwipeOptions): UseSwipeReturn {
  const swipeState = useRef<SwipeState | null>(null);
  const isHorizontalSwipe = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    swipeState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    };
    isHorizontalSwipe.current = false;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!swipeState.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - swipeState.current.startX;
      const deltaY = touch.clientY - swipeState.current.startY;

      // Determine if this is primarily a horizontal swipe
      if (!isHorizontalSwipe.current && Math.abs(deltaX) > 10) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
      }

      // Prevent vertical scrolling during horizontal swipe if configured
      if (preventScroll && isHorizontalSwipe.current) {
        e.preventDefault();
      }
    },
    [preventScroll]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!swipeState.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - swipeState.current.startX;
      const deltaY = touch.clientY - swipeState.current.startY;
      const deltaTime = Date.now() - swipeState.current.startTime;

      // Calculate velocity (px/ms)
      const velocityX = Math.abs(deltaX) / deltaTime;
      const velocityY = Math.abs(deltaY) / deltaTime;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Determine swipe direction based on threshold and velocity
      const isValidSwipe =
        (absX >= threshold || velocityX >= velocityThreshold) ||
        (absY >= threshold || velocityY >= velocityThreshold);

      if (isValidSwipe) {
        // Horizontal swipe takes priority if X delta is larger
        if (absX > absY) {
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown();
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp();
          }
        }
      }

      swipeState.current = null;
      isHorizontalSwipe.current = false;
    },
    [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, velocityThreshold]
  );

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * Hook for swipe-to-reveal pattern (e.g., swipe to reveal delete button)
 */
interface UseSwipeRevealOptions {
  maxOffset?: number; // Maximum swipe offset (default: 80)
  threshold?: number; // Threshold to snap open (default: 40)
  onOpen?: () => void;
  onClose?: () => void;
}

interface UseSwipeRevealReturn {
  offset: number;
  isOpen: boolean;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  close: () => void;
}

export function useSwipeReveal({
  maxOffset = 80,
  threshold = 40,
  onOpen,
  onClose,
}: UseSwipeRevealOptions = {}): UseSwipeRevealReturn {
  const swipeState = useRef<{ startX: number; currentOffset: number } | null>(null);
  const [offset, setOffset] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const offsetRef = useRef(0);

  const setOffsetAndSync = useCallback((nextOffset: number) => {
    offsetRef.current = nextOffset;
    setOffset(nextOffset);
  }, []);

  const close = useCallback(() => {
    setOffsetAndSync(0);
    setIsOpen(false);
    onClose?.();
  }, [onClose, setOffsetAndSync]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    swipeState.current = {
      startX: touch.clientX,
      currentOffset: offsetRef.current,
    };
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!swipeState.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - swipeState.current.startX;
      let newOffset = swipeState.current.currentOffset - deltaX;

      // Clamp offset between 0 and maxOffset
      newOffset = Math.max(0, Math.min(maxOffset, newOffset));

      // Add rubber band effect at edges
      if (newOffset > maxOffset * 0.9) {
        newOffset = maxOffset * 0.9 + (newOffset - maxOffset * 0.9) * 0.2;
      }

      setOffsetAndSync(newOffset);
    },
    [maxOffset, setOffsetAndSync]
  );

  const handleTouchEnd = useCallback(() => {
    if (!swipeState.current) return;

    // Snap to open or closed state
    if (offsetRef.current > threshold) {
      setOffsetAndSync(maxOffset);
      if (!isOpen) {
        setIsOpen(true);
        onOpen?.();
      }
    } else {
      setOffsetAndSync(0);
      if (isOpen) {
        setIsOpen(false);
        onClose?.();
      }
    }

    swipeState.current = null;
  }, [threshold, maxOffset, onOpen, onClose, isOpen, setOffsetAndSync]);

  return {
    offset,
    isOpen,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    close,
  };
}

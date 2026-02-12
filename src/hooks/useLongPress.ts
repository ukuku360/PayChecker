import { useRef, useCallback } from 'react';

interface Options {
  threshold?: number;
  onLongPress: (e: React.MouseEvent | React.TouchEvent) => void;
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
  onDoubleClick?: (e: React.MouseEvent | React.TouchEvent) => void;
  shouldStopPropagation?: boolean;
}

type LongPressNativeEvent = Event & { _longPressHandled?: boolean };

export const useLongPress = ({ 
  onLongPress, 
  onClick, 
  onDoubleClick, 
  threshold = 500,
  shouldStopPropagation = false
}: Options) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);

  const wasHandled = useCallback((e: React.MouseEvent | React.TouchEvent) =>
    Boolean((e.nativeEvent as LongPressNativeEvent)._longPressHandled), []);

  const markHandled = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    (e.nativeEvent as LongPressNativeEvent)._longPressHandled = true;
  }, []);

  const start = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Check if already handled by a child component
    if (wasHandled(e)) {
      return;
    }

    if (shouldStopPropagation) {
      e.stopPropagation();
      markHandled(e);
    }
    // Only left click or touch
    if ('button' in e && e.button !== 0) return;

    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress(e);
    }, threshold);
  }, [onLongPress, threshold, shouldStopPropagation, wasHandled, markHandled]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const end = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Check if already handled by a child component
    if (wasHandled(e)) {
      clear();
      return;
    }

    if (shouldStopPropagation) {
      e.stopPropagation();
      markHandled(e);
    }
    clear();

    // If it wasn't a long press, it's a click or double click
    if (!isLongPressRef.current) {
        if (onDoubleClick) {
            // Clear any previous timeout to prevent stale state
            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
            }
            clickCountRef.current += 1;
            if (clickCountRef.current === 1) {
                clickTimeoutRef.current = setTimeout(() => {
                    if (clickCountRef.current === 1 && onClick) {
                         onClick(e);
                    }
                    clickCountRef.current = 0;
                    clickTimeoutRef.current = null;
                }, 250); // Typical double click threshold
            } else if (clickCountRef.current >= 2) {
                clickTimeoutRef.current = null;
                onDoubleClick(e);
                clickCountRef.current = 0;
            }
        } else if (onClick) {
            onClick(e);
        }
    }
  }, [clear, onClick, onDoubleClick, shouldStopPropagation, wasHandled, markHandled]);

  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: end,
    onTouchEnd: end,
    onMouseLeave: clear,
    onTouchCancel: clear,
    // Prevent context menu on mobile long press
    onContextMenu: (e: React.MouseEvent) => {
        if (isLongPressRef.current) {
             e.preventDefault();
        }
    }
  };
};

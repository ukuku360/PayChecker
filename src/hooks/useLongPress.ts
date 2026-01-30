import { useRef, useCallback } from 'react';

interface Options {
  threshold?: number;
  onLongPress: (e: React.MouseEvent | React.TouchEvent) => void;
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
  onDoubleClick?: (e: React.MouseEvent | React.TouchEvent) => void;
}

export const useLongPress = ({ 
  onLongPress, 
  onClick, 
  onDoubleClick, 
  threshold = 500 
}: Options) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);

  const start = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Only left click or touch
    if ('button' in e && e.button !== 0) return;

    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress(e);
    }, threshold);
  }, [onLongPress, threshold]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const end = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    clear();
    
    // If it wasn't a long press, it's a click or double click
    if (!isLongPressRef.current) {
        if (onDoubleClick) {
            clickCountRef.current += 1;
            if (clickCountRef.current === 1) {
                clickTimeoutRef.current = setTimeout(() => {
                    if (clickCountRef.current === 1 && onClick) {
                         onClick(e);
                    }
                    clickCountRef.current = 0;
                }, 250); // Typical double click threshold
            } else if (clickCountRef.current === 2) {
                if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
                onDoubleClick(e);
                clickCountRef.current = 0;
            }
        } else if (onClick) {
            onClick(e);
        }
    }
  }, [clear, onClick, onDoubleClick]);

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

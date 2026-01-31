import { useEffect, useRef, useCallback, useState } from 'react';
import { clsx } from 'clsx';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Snap points as percentage of viewport height (default: [0.5, 0.9]) */
  snapPoints?: number[];
  /** Initial snap point index (default: 0) */
  initialSnap?: number;
  /** Whether to show drag handle (default: true) */
  showHandle?: boolean;
  /** Whether clicking backdrop closes the sheet (default: true) */
  closeOnBackdropClick?: boolean;
  /** Additional class name for the sheet container */
  className?: string;
}

interface DragState {
  startY: number;
  startHeight: number;
  isDragging: boolean;
}

/**
 * Mobile-optimized bottom sheet modal component
 * - Slides up from the bottom of the screen
 * - Supports drag to close or snap to different heights
 * - Focus trap for accessibility
 * - ESC key to close
 */
export function BottomSheet({
  isOpen,
  onClose,
  children,
  snapPoints = [0.5, 0.9],
  initialSnap = 0,
  showHandle = true,
  closeOnBackdropClick = true,
  className,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);
  const [currentHeight, setCurrentHeight] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Calculate initial height based on snap point
  const getSnapHeight = useCallback(
    (index: number) => {
      const vh = window.innerHeight;
      return vh * snapPoints[Math.min(index, snapPoints.length - 1)];
    },
    [snapPoints]
  );

  // Handle opening animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Small delay to trigger CSS transition
      requestAnimationFrame(() => {
        setCurrentHeight(getSnapHeight(initialSnap));
      });
    } else {
      setCurrentHeight(0);
      // Wait for close animation
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialSnap, getSnapHeight]);

  // Focus trap and ESC key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && contentRef.current) {
        const focusableElements = contentRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first focusable element when opened
    const timer = setTimeout(() => {
      const focusable = contentRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }, 100);

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when sheet is open
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Drag handlers
  const handleDragStart = useCallback(
    (clientY: number) => {
      if (!sheetRef.current) return;
      setIsAnimating(false);
      dragState.current = {
        startY: clientY,
        startHeight: currentHeight || getSnapHeight(initialSnap),
        isDragging: true,
      };
    },
    [currentHeight, initialSnap, getSnapHeight]
  );

  const handleDragMove = useCallback((clientY: number) => {
    if (!dragState.current?.isDragging) return;

    const deltaY = dragState.current.startY - clientY;
    const newHeight = Math.max(0, dragState.current.startHeight + deltaY);
    setCurrentHeight(newHeight);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!dragState.current?.isDragging) return;

    setIsAnimating(true);
    const vh = window.innerHeight;
    const heightPercent = (currentHeight || 0) / vh;

    // Find closest snap point or close if below threshold
    if (heightPercent < 0.15) {
      // Close if dragged below 15% of viewport
      onClose();
    } else {
      // Find closest snap point
      let closestSnap = snapPoints[0];
      let closestDiff = Math.abs(heightPercent - snapPoints[0]);

      for (const snap of snapPoints) {
        const diff = Math.abs(heightPercent - snap);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestSnap = snap;
        }
      }

      setCurrentHeight(vh * closestSnap);
    }

    dragState.current = null;
  }, [currentHeight, snapPoints, onClose]);

  // Touch event handlers for the handle
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      handleDragStart(e.touches[0].clientY);
    },
    [handleDragStart]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      handleDragMove(e.touches[0].clientY);
    },
    [handleDragMove]
  );

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Mouse event handlers for the handle (desktop testing)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      handleDragStart(e.clientY);

      const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
      const handleMouseUp = () => {
        handleDragEnd();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [handleDragStart, handleDragMove, handleDragEnd]
  );

  if (!isVisible) return null;

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50',
        isAnimating && 'transition-opacity duration-300'
      )}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className={clsx(
          'absolute inset-0 bg-black/40 backdrop-blur-sm',
          isAnimating && 'transition-opacity duration-300',
          currentHeight && currentHeight > 0 ? 'opacity-100' : 'opacity-0'
        )}
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          height: currentHeight ?? 0,
          maxHeight: '95vh',
        }}
        className={clsx(
          'absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl overflow-hidden flex flex-col',
          isAnimating && 'transition-[height] duration-300 ease-out',
          className
        )}
      >
        {/* Drag handle */}
        {showHandle && (
          <div
            className="flex-shrink-0 py-4 cursor-grab active:cursor-grabbing touch-none min-h-[44px] flex items-center justify-center"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            role="slider"
            aria-label="Drag to resize or close"
            tabIndex={0}
          >
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>
        )}

        {/* Content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto overscroll-contain px-4 pb-safe"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

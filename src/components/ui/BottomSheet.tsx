import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Whether clicking backdrop closes the sheet (default: true) */
  closeOnBackdropClick?: boolean;
  /** Additional class name for the sheet container */
  className?: string;
  // Deprecated/Ignored props maintained for compatibility
  snapPoints?: number[];
  initialSnap?: number;
  showHandle?: boolean;
}

/**
 * Mobile-optimized bottom sheet modal component
 * - Slides up from the bottom of the screen
 * - Clean interface with Close button (no drag)
 * - Focus trap for accessibility
 * - ESC key to close
 */
export function BottomSheet({
  isOpen,
  onClose,
  children,
  closeOnBackdropClick = true,
  className,
}: BottomSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  
  // Track visual viewport for virtual keyboard support
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.visualViewport?.height || window.innerHeight : 0
  );

  useEffect(() => {
    const handleResize = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      setViewportHeight(height);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle opening/closing animation
  useEffect(() => {
    if (isOpen) {
      setIsRendering(true);
      // Small delay to trigger CSS transition
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
      // Wait for close animation
      const timer = setTimeout(() => setIsRendering(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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

  if (!isRendering) return null;

  return (
    <div
      className="fixed left-0 right-0 z-50 pointer-events-none"
      style={{
        top: 0,
        height: viewportHeight,
      }}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className={clsx(
          'absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={clsx(
          'absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto transition-transform duration-300 ease-out',
          isVisible ? 'translate-y-0' : 'translate-y-full',
          className
        )}
        style={{
          maxHeight: '92%', // Leave a bit of space at the top
        }}
      >
        {/* Header with Close Button */}
        <div className="flex items-center justify-end px-4 py-3 border-b border-slate-100 flex-shrink-0 relative">
           {/* Center handle-like visual for aesthetic or just empty space? User wanted "Clean". 
               Let's just put the Close button on the right. 
               The title is usually inside content (child), so we shouldn't force a title here.
           */}
           <button 
             onClick={onClose}
             className="p-2 -mr-2 text-slate-400 hover:text-slate-600 active:text-slate-800 transition-colors rounded-full hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
             aria-label="Close"
           >
             <X className="w-6 h-6" />
           </button>
        </div>

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

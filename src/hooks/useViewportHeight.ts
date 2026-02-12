import { useState, useEffect } from 'react';

/**
 * Hook to track visual viewport height for virtual keyboard support on mobile.
 * When the virtual keyboard opens, visualViewport.height shrinks while innerHeight stays the same.
 * This allows UI components to adjust their height to remain visible above the keyboard.
 */
export function useViewportHeight() {
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.visualViewport?.height || window.innerHeight : 0
  );

  useEffect(() => {
    const handleResize = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      setViewportHeight(height);
    };

    // Initial measurement
    handleResize();

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

  // Calculate if keyboard is likely open (viewport significantly smaller than window)
  const isKeyboardOpen = typeof window !== 'undefined' &&
    window.innerHeight - viewportHeight > 100;

  return { viewportHeight, isKeyboardOpen };
}

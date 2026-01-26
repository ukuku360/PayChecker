import React, { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface GoogleAdProps {
  slot?: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  responsive?: boolean;
  style?: React.CSSProperties;
  className?: string; // Add className prop for flexibility
}

export const GoogleAd: React.FC<GoogleAdProps> = ({ 
  slot = '8564028791', // Main Banner Slot
  format = 'auto', 
  responsive = true,
  style,
  className
}) => {
  const adRef = React.useRef<HTMLModElement>(null);
  const initialized = React.useRef(false);

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (initialized.current) return;

    // Check if ad is already loaded in this specific element
    if (adRef.current && adRef.current.getAttribute('data-adsbygoogle-status')) {
      return;
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      initialized.current = true;
    } catch (e) {
      console.error('Google Ads error:', e);
    }
  }, []);

  return (
    <div className={`google-ad-container ${className || ''}`} style={{ overflow: 'hidden', ...style }}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-4516626856296531" // Replace with actual client ID
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
};

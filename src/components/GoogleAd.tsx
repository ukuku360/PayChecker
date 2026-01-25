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
  slot = '0000000000', // Default dummy slot, user needs to replace
  format = 'auto', 
  responsive = true,
  style,
  className
}) => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('Google Ads error:', e);
    }
  }, []);

  return (
    <div className={`google-ad-container ${className || ''}`} style={{ overflow: 'hidden', ...style }}>
      <ins
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

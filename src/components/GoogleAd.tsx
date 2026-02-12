import React, { useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>;
  }
}

interface GoogleAdProps {
  slot?: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  responsive?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const GoogleAd: React.FC<GoogleAdProps> = ({
  slot = '8564028791',
  format = 'auto',
  responsive = true,
  style,
  className
}) => {
  const adRef = useRef<HTMLModElement>(null);
  const initialized = useRef(false);

  const loadAd = useCallback(() => {
    if (initialized.current) return;
    if (adRef.current?.getAttribute('data-adsbygoogle-status')) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      initialized.current = true;
    } catch (error) {
      console.error('Google Ads error:', error);
    }
  }, []);

  useEffect(() => {
    // If adsbygoogle script is already loaded, push immediately
    const script = document.querySelector<HTMLScriptElement>(
      'script[src*="adsbygoogle"]'
    );

    if (script?.dataset.adsbygoogleStatus === 'done' || window.adsbygoogle?.length >= 0) {
      loadAd();
    } else if (script) {
      // Script exists but not yet loaded — wait for it
      script.addEventListener('load', loadAd);
    }

    return () => {
      script?.removeEventListener('load', loadAd);
      initialized.current = false;
    };
  }, [loadAd]);

  return (
    <div className={`google-ad-container ${className || ''}`} style={{ overflow: 'hidden', ...style }}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-4516626856296531"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
};

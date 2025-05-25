import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Initialize with the current window width to avoid flash of desktop layout
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Check on mount and when window resizes
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Also check when orientation changes
    window.addEventListener('orientationchange', () => {
      // Small delay to ensure window.innerWidth is updated
      setTimeout(checkMobile, 100);
    });

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  return isMobile;
}

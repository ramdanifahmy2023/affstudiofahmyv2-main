// src/hooks/use-mobile.tsx

import { useState, useEffect } from 'react';

// Hook ini akan mengecek apakah lebar layar <= 768px (breakpoint 'md' tailwind)
export const useMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    
    const handleResize = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Set state awal
    setIsMobile(mediaQuery.matches);

    // Tambahkan listener
    // Note: addEventListener/removeEventListener adalah cara modern
    mediaQuery.addEventListener('change', handleResize);

    // Cleanup listener saat komponen unmount
    return () => {
      mediaQuery.removeEventListener('change', handleResize);
    };
  }, []);

  return isMobile;
};
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useScrollToTop = (excludePaths: string[] = []) => {
  const location = useLocation();

  useEffect(() => {
    // Check if current path should be excluded from scroll to top
    const shouldExclude = excludePaths.some(path => 
      location.pathname.includes(path)
    );

    if (!shouldExclude) {
      // Scroll to top smoothly when route changes
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [location.pathname, excludePaths]);
};
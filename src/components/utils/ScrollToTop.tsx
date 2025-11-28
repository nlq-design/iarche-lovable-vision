import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    // Ne pas scroll to top sur la homepage (préserver l'effet portail)
    if (pathname !== '/') {
      window.scrollTo(0, 0);
    }
  }, [pathname]);
  
  return null;
};

export default ScrollToTop;

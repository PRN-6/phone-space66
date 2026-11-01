import React, { useState, useEffect } from 'react';
import { DesktopEnvironment } from './components/desktop/DesktopEnvironment';
import { MobileCompanion } from './components/mobile/MobileCompanion';

export const App: React.FC = () => {
  const [isMobileMode, setIsMobileMode] = useState(false);

  useEffect(() => {
    const checkMode = () => {
      const params = new URLSearchParams(window.location.search);
      const isMobileParam = params.get('mode') === 'mobile' || params.has('mobile');
      const isMobileHash = window.location.hash.includes('mobile');
      const isSmallScreen = window.innerWidth <= 640 && !params.has('desktop');

      if (isMobileParam || isMobileHash || isSmallScreen) {
        setIsMobileMode(true);
      } else {
        setIsMobileMode(false);
      }
    };

    checkMode();
    window.addEventListener('resize', checkMode);
    window.addEventListener('popstate', checkMode);
    return () => {
      window.removeEventListener('resize', checkMode);
      window.removeEventListener('popstate', checkMode);
    };
  }, []);

  if (isMobileMode) {
    return <MobileCompanion />;
  }

  return <DesktopEnvironment />;
};

export default App;

import { useState, useEffect } from 'react';

export function useFTUE() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const hasSeenWelcome = localStorage.getItem('prakruti_ftue_seen');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

  const dismissWelcome = () => {
    localStorage.setItem('prakruti_ftue_seen', 'true');
    setShowWelcome(false);
  };

  // Avoid hydration mismatch by not rendering the overlay until mounted
  return { 
    showWelcome: isMounted ? showWelcome : false, 
    dismissWelcome 
  };
}

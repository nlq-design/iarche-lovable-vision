import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

// Remplacer par votre Measurement ID Google Analytics 4
const GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // TODO: Remplacer par votre ID

const GoogleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Initialiser GA4 au premier chargement
    if (GA4_MEASUREMENT_ID && GA4_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
      ReactGA.initialize(GA4_MEASUREMENT_ID, {
        gaOptions: {
          anonymizeIp: true, // RGPD: anonymiser les IPs
        },
      });
    }
  }, []);

  useEffect(() => {
    // Tracker chaque changement de page
    if (GA4_MEASUREMENT_ID && GA4_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
      ReactGA.send({ 
        hitType: 'pageview', 
        page: location.pathname + location.search,
        title: document.title 
      });
    }
  }, [location]);

  return null;
};

export default GoogleAnalytics;

// Helper functions pour tracker des événements personnalisés
export const trackEvent = (category: string, action: string, label?: string) => {
  if (GA4_MEASUREMENT_ID && GA4_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
    ReactGA.event({
      category,
      action,
      label,
    });
  }
};

export const trackFormSubmission = (formName: string, success: boolean) => {
  trackEvent('Form', success ? 'Submit Success' : 'Submit Error', formName);
};

export const trackCTAClick = (ctaName: string, destination: string) => {
  trackEvent('CTA', 'Click', `${ctaName} -> ${destination}`);
};

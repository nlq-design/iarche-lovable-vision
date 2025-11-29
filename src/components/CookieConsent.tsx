import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ConsentPreferences {
  analytics: boolean;
  marketing: boolean;
}

const CONSENT_KEY = 'iarche_cookie_consent';
const CONSENT_VERSION = '1.0';

export const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      setShowBanner(true);
    } else {
      const parsed = JSON.parse(consent);
      setPreferences(parsed.preferences);
      applyConsent(parsed.preferences);
    }
  }, []);

  const applyConsent = (prefs: ConsentPreferences) => {
    // Initialize dataLayer
    (window as any).dataLayer = (window as any).dataLayer || [];
    
    // Update GTM consent
    (window as any).dataLayer.push({
      event: 'consent_update',
      analytics_storage: prefs.analytics ? 'granted' : 'denied',
      ad_storage: prefs.marketing ? 'granted' : 'denied',
    });

    // Push consent event
    (window as any).dataLayer.push({
      event: 'cookie_consent_given',
      consent_analytics: prefs.analytics,
      consent_marketing: prefs.marketing,
    });
  };

  const saveConsent = (prefs: ConsentPreferences) => {
    const consent = {
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      preferences: prefs,
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    setPreferences(prefs);
    applyConsent(prefs);
    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    saveConsent({ analytics: true, marketing: true });
  };

  const rejectAll = () => {
    saveConsent({ analytics: false, marketing: false });
  };

  const saveCustomPreferences = () => {
    saveConsent(preferences);
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 max-w-sm">
        <Card className="bg-background/95 backdrop-blur-sm border border-border shadow-lg">
          <div className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Cookies
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Nous utilisons des cookies pour améliorer votre expérience. 
                  <a
                    href="/confidentialite"
                    className="text-accent hover:underline ml-1"
                  >
                    En savoir plus
                  </a>
                </p>
              </div>
              <button
                onClick={rejectAll}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={acceptAll}
                size="sm"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Accepter
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowSettings(true)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Settings className="mr-1 h-3 w-3" aria-hidden="true" />
                  Gérer
                </Button>
                <Button onClick={rejectAll} variant="outline" size="sm" className="flex-1">
                  Refuser
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Préférences de cookies</DialogTitle>
            <DialogDescription>
              Gérez vos préférences en matière de cookies et de confidentialité.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label className="text-base font-medium">Cookies essentiels</Label>
                  <p className="text-sm text-muted-foreground">
                    Nécessaires au fonctionnement du site. Toujours activés.
                  </p>
                </div>
                <Switch checked disabled />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label htmlFor="analytics" className="text-base font-medium cursor-pointer">
                    Cookies analytiques
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Google Analytics pour comprendre l'utilisation du site.
                  </p>
                </div>
                <Switch
                  id="analytics"
                  checked={preferences.analytics}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, analytics: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label htmlFor="marketing" className="text-base font-medium cursor-pointer">
                    Cookies marketing
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Pour les campagnes publicitaires et le remarketing.
                  </p>
                </div>
                <Switch
                  id="marketing"
                  checked={preferences.marketing}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, marketing: checked })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={saveCustomPreferences} className="flex-1">
              Enregistrer mes préférences
            </Button>
            <Button
              onClick={() => setShowSettings(false)}
              variant="outline"
              className="flex-1"
            >
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

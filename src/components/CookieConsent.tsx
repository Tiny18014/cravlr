import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Cookie, Settings, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  preferences: boolean;
  marketing: boolean;
}

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always required
    analytics: false,
    preferences: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    } else {
      const savedPreferences = JSON.parse(consent);
      setPreferences(savedPreferences);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem('cookie-consent', JSON.stringify(prefs));
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    
    // Apply cookie preferences
    if (!prefs.analytics) {
      // Disable analytics cookies
      localStorage.removeItem('analytics-enabled');
    } else {
      localStorage.setItem('analytics-enabled', 'true');
    }
    
    setPreferences(prefs);
    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    const allAccepted = {
      essential: true,
      analytics: true,
      preferences: true,
      marketing: true,
    };
    savePreferences(allAccepted);
  };

  const acceptEssential = () => {
    const essentialOnly = {
      essential: true,
      analytics: false,
      preferences: false,
      marketing: false,
    };
    savePreferences(essentialOnly);
  };

  const updatePreference = (key: keyof CookiePreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: key === 'essential' ? true : value, // Essential always true
    }));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
        <Card className="mx-auto max-w-4xl border-2 bg-background/95 backdrop-blur-sm shadow-lg">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <Cookie className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Cookie Preferences</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We use cookies to enhance your experience, analyze site traffic, and personalize content. 
                  You can customize your preferences or accept all cookies.{' '}
                  <Link to="/privacy-policy" className="text-primary hover:underline">
                    Learn more in our Privacy Policy
                  </Link>.
                </p>
                
                {!showSettings && (
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={acceptAll} className="flex-shrink-0">
                      Accept All
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={acceptEssential}
                      className="flex-shrink-0"
                    >
                      Essential Only
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowSettings(true)}
                      className="flex items-center gap-2 flex-shrink-0"
                    >
                      <Settings className="h-4 w-4" />
                      Customize
                    </Button>
                  </div>
                )}

                {/* Cookie Settings */}
                {showSettings && (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Essential Cookies</h4>
                          <p className="text-xs text-muted-foreground">
                            Required for basic site functionality and security
                          </p>
                        </div>
                        <Switch checked={true} disabled />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Analytics Cookies</h4>
                          <p className="text-xs text-muted-foreground">
                            Help us understand how you use our site
                          </p>
                        </div>
                        <Switch 
                          checked={preferences.analytics}
                          onCheckedChange={(checked) => updatePreference('analytics', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Preference Cookies</h4>
                          <p className="text-xs text-muted-foreground">
                            Remember your settings and preferences
                          </p>
                        </div>
                        <Switch 
                          checked={preferences.preferences}
                          onCheckedChange={(checked) => updatePreference('preferences', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Marketing Cookies</h4>
                          <p className="text-xs text-muted-foreground">
                            Personalize content and ads
                          </p>
                        </div>
                        <Switch 
                          checked={preferences.marketing}
                          onCheckedChange={(checked) => updatePreference('marketing', checked)}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                      <Button onClick={() => savePreferences(preferences)}>
                        Save Preferences
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowSettings(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={acceptEssential}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};

export default CookieConsent;
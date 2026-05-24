'use client'

import { useState, useEffect } from 'react'
import { Button } from '@novagross/ui'
import Link from 'next/link'
import { X, Cookie, Settings } from 'lucide-react'

type CookieConsent = {
  necessary: boolean
  analytics: boolean
  marketing: boolean
  preferences: boolean
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [consent, setConsent] = useState<CookieConsent>({
    necessary: true, // Always true
    analytics: false,
    marketing: false,
    preferences: false,
  })

  useEffect(() => {
    // Check if user has already given consent
    const consentData = localStorage.getItem('cookie-consent')
    if (!consentData) {
      // Show banner after 1 second
      setTimeout(() => setShowBanner(true), 1000)
    }
  }, [])

  const acceptAll = () => {
    const allConsent: CookieConsent = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    }
    saveConsent(allConsent)
  }

  const acceptNecessary = () => {
    const necessaryOnly: CookieConsent = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    }
    saveConsent(necessaryOnly)
  }

  const saveCustomConsent = () => {
    saveConsent(consent)
    setShowSettings(false)
  }

  const saveConsent = (consentData: CookieConsent) => {
    localStorage.setItem('cookie-consent', JSON.stringify(consentData))
    localStorage.setItem('cookie-consent-date', new Date().toISOString())
    setShowBanner(false)
    
    // Trigger custom event to notify other components (like Google Analytics)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cookie-consent-updated'))
    }
    
    // Enable analytics if consented
    if (consentData.analytics && typeof window !== 'undefined') {
      console.log('Analytics enabled')
    }
    
    // Enable marketing pixels if consented
    if (consentData.marketing && typeof window !== 'undefined') {
      console.log('Marketing enabled')
    }
  }

  if (!showBanner) return null

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg">
        <div className="container py-4 px-4 md:px-6">
          {!showSettings ? (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1 flex items-start gap-3">
                <Cookie className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">🍪 Çerez Kullanımı</h3>
                  <p className="text-sm text-muted-foreground">
                    Web sitemizde size en iyi deneyimi sunmak için çerezler kullanıyoruz. 
                    Çerez kullanımı hakkında daha fazla bilgi için{' '}
                    <Link href="/cerez-politikasi" className="text-primary hover:underline">
                      Çerez Politikası
                    </Link>
                    {' '}sayfamızı ziyaret edebilirsiniz.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Ayarlar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={acceptNecessary}
                >
                  Sadece Gerekli
                </Button>
                <Button
                  size="sm"
                  onClick={acceptAll}
                >
                  Tümünü Kabul Et
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Çerez Tercihleri</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Necessary Cookies */}
                <div className="flex items-start justify-between p-3 bg-muted rounded-md">
                  <div className="flex-1">
                    <div className="font-medium">Gerekli Çerezler</div>
                    <p className="text-sm text-muted-foreground">
                      Web sitesinin temel işlevleri için gereklidir. Devre dışı bırakılamaz.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="mt-1"
                  />
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-start justify-between p-3 bg-muted rounded-md">
                  <div className="flex-1">
                    <div className="font-medium">Analitik Çerezler</div>
                    <p className="text-sm text-muted-foreground">
                      Ziyaretçi davranışlarını anlamamıza ve site performansını iyileştirmemize yardımcı olur.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={consent.analytics}
                    onChange={(e) => setConsent({ ...consent, analytics: e.target.checked })}
                    className="mt-1"
                  />
                </div>

                {/* Marketing Cookies */}
                <div className="flex items-start justify-between p-3 bg-muted rounded-md">
                  <div className="flex-1">
                    <div className="font-medium">Pazarlama Çerezleri</div>
                    <p className="text-sm text-muted-foreground">
                      İlginizi çekebilecek reklamları göstermek için kullanılır.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={consent.marketing}
                    onChange={(e) => setConsent({ ...consent, marketing: e.target.checked })}
                    className="mt-1"
                  />
                </div>

                {/* Preference Cookies */}
                <div className="flex items-start justify-between p-3 bg-muted rounded-md">
                  <div className="flex-1">
                    <div className="font-medium">Tercih Çerezleri</div>
                    <p className="text-sm text-muted-foreground">
                      Dil, bölge gibi tercihlerinizi hatırlamak için kullanılır.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={consent.preferences}
                    onChange={(e) => setConsent({ ...consent, preferences: e.target.checked })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowSettings(false)}>
                  İptal
                </Button>
                <Button onClick={saveCustomConsent}>
                  Tercihleri Kaydet
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

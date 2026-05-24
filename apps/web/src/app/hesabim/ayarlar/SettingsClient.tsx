'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@novagross/ui'
import { Bell, Mail, Lock, Globe, Loader2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type UserProfile = {
  newsletter_subscribed: boolean
  email_notifications: boolean
  sms_notifications: boolean
  push_notifications: boolean
  personalized_offers: boolean
  locale: string
  currency: string
}

type Props = {
  userId: string
  initialProfile: UserProfile
}

type TotpEnrollment = {
  factorId: string
  qrSvg: string
  secret: string
}

const LOCALE_OPTIONS = [
  { value: 'tr', label: 'Türkçe' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
]

const CURRENCY_OPTIONS = [
  { value: 'TRY', label: 'TRY (₺)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
]

export default function SettingsClient({ userId, initialProfile }: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [saving, setSaving] = useState(false)
  
  // User preferences state
  const [emailNotifications, setEmailNotifications] = useState(initialProfile.email_notifications)
  const [smsNotifications, setSmsNotifications] = useState(initialProfile.sms_notifications)
  const [pushNotifications, setPushNotifications] = useState(initialProfile.push_notifications)
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(initialProfile.newsletter_subscribed)
  const [personalizedOffers, setPersonalizedOffers] = useState(initialProfile.personalized_offers)
  const [locale, setLocale] = useState(initialProfile.locale)
  const [currency, setCurrency] = useState(initialProfile.currency)

  const [mfaLoading, setMfaLoading] = useState(true)
  const [totpEnabled, setTotpEnabled] = useState(false)
  const [aal, setAal] = useState<'aal1' | 'aal2' | 'aal3' | 'unknown'>('unknown')

  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [disableCode, setDisableCode] = useState('')

  async function refreshMfaState() {
    setMfaLoading(true)
    try {
      const [{ data: factorsData, error: factorsError }, { data: aalData, error: aalError }] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ])

      if (factorsError) throw factorsError
      if (aalError) throw aalError

      setTotpEnabled((factorsData?.totp ?? []).some((f) => f.status === 'verified'))
      setAal((aalData?.currentLevel as any) ?? 'unknown')
    } catch (err: any) {
      console.error('MFA state error', err)
      toast.error(err?.message ?? 'MFA durumu alınamadı')
      setTotpEnabled(false)
      setAal('unknown')
    } finally {
      setMfaLoading(false)
    }
  }

  useEffect(() => {
    refreshMfaState()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveProfileSettings() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          metadata: {
            newsletter_subscribed: newsletterSubscribed,
            email_notifications: emailNotifications,
            sms_notifications: smsNotifications,
            push_notifications: pushNotifications,
            personalized_offers: personalizedOffers,
            locale,
            currency,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error

      toast.success('Ayarlar kaydedildi')
    } catch (err: any) {
      console.error('Save settings error', err)
      toast.error(err?.message ?? 'Ayarlar kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  async function downloadUserData() {
    setSaving(true)
    try {
      const [{ data: profile }, { data: orders }, { data: addresses }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('orders').select('*').eq('user_id', userId),
        supabase.from('addresses').select('*').eq('user_id', userId),
      ])

      const exportData = {
        exportDate: new Date().toISOString(),
        profile,
        orders: orders ?? [],
        addresses: addresses ?? [],
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `novastore-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Verileriniz indirildi')
    } catch (err: any) {
      console.error('Download data error', err)
      toast.error(err?.message ?? 'Veri indirilemedi')
    } finally {
      setSaving(false)
    }
  }

  async function startTotpEnrollment() {
    setMfaLoading(true)
    setEnrollment(null)
    setVerificationCode('')

    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (error) throw error

      setEnrollment({
        factorId: data.id,
        qrSvg: data.totp.qr_code,
        secret: data.totp.secret,
      })

      toast.message('QR kodu okutun ve kodu girin')
    } catch (err: any) {
      console.error('Enroll error', err)
      toast.error(err?.message ?? '2FA başlatılamadı')
    } finally {
      setMfaLoading(false)
    }
  }

  async function verifyTotpEnrollment() {
    if (!enrollment) return
    const code = verificationCode.trim()

    if (code.length < 6) {
      toast.error('Lütfen 6 haneli kod girin')
      return
    }

    setMfaLoading(true)
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollment.factorId,
        code,
      })
      if (error) throw error

      toast.success('İki faktörlü doğrulama etkinleştirildi')
      setEnrollment(null)
      setVerificationCode('')
      await refreshMfaState()
    } catch (err: any) {
      console.error('Verify enroll error', err)
      toast.error(err?.message ?? 'Kod doğrulanamadı')
    } finally {
      setMfaLoading(false)
    }
  }

  async function disableTotp() {
    setMfaLoading(true)
    try {
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors()
      if (factorsError) throw factorsError

      const factor = (factorsData?.totp ?? []).find((f) => f.status === 'verified')
      if (!factor) {
        toast.message('Etkin 2FA bulunamadı')
        await refreshMfaState()
        return
      }

      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aalError) throw aalError

      const current = (aalData?.currentLevel as any) ?? 'unknown'

      // Unenroll requires aal2. If we are not at aal2, require a code first.
      if (current !== 'aal2') {
        const code = disableCode.trim()
        if (code.length < 6) {
          toast.error('Kapatmak için doğrulama kodu gerekli')
          return
        }

        const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
          factorId: factor.id,
          code,
        })
        if (verifyError) throw verifyError
      }

      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
      if (unenrollError) throw unenrollError

      toast.success('İki faktörlü doğrulama kapatıldı')
      setDisableCode('')
      await refreshMfaState()
    } catch (err: any) {
      console.error('Disable MFA error', err)
      toast.error(err?.message ?? '2FA kapatılamadı')
    } finally {
      setMfaLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ayarlar</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Bildirim Tercihleri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">E-posta Bildirimleri</p>
              <p className="text-sm text-muted-foreground">Sipariş durumu ve kampanyalar hakkında bildirim al</p>
            </div>
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="h-4 w-4"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">SMS Bildirimleri</p>
              <p className="text-sm text-muted-foreground">Önemli güncellemeler için SMS al</p>
            </div>
            <input
              type="checkbox"
              checked={smsNotifications}
              onChange={(e) => setSmsNotifications(e.target.checked)}
              className="h-4 w-4"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Push Bildirimleri</p>
              <p className="text-sm text-muted-foreground">Tarayıcı bildirimleri almak için izin ver</p>
            </div>
            <input
              type="checkbox"
              checked={pushNotifications}
              onChange={(e) => setPushNotifications(e.target.checked)}
              className="h-4 w-4"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Pazarlama İletişimi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">E-Bülten</p>
              <p className="text-sm text-muted-foreground">Kampanya ve fırsatlardan haberdar ol</p>
            </div>
            <input
              type="checkbox"
              checked={newsletterSubscribed}
              onChange={(e) => setNewsletterSubscribed(e.target.checked)}
              className="h-4 w-4"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Kişiselleştirilmiş Teklifler</p>
              <p className="text-sm text-muted-foreground">İlgi alanlarına göre özel teklifler al</p>
            </div>
            <input
              type="checkbox"
              checked={personalizedOffers}
              onChange={(e) => setPersonalizedOffers(e.target.checked)}
              className="h-4 w-4"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Gizlilik ve Güvenlik
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">İki Faktörlü Doğrulama (2FA)</p>
              <p className="text-sm text-muted-foreground">
                {mfaLoading
                  ? 'Kontrol ediliyor…'
                  : totpEnabled
                    ? `Etkin (AAL: ${aal})`
                    : 'Kapalı'}
              </p>
            </div>

            {mfaLoading ? (
              <Button variant="outline" size="sm" disabled>
                <Loader2 className="h-4 w-4 animate-spin" />
              </Button>
            ) : totpEnabled ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Kodu gir (gerekirse)"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  className="h-9 px-3 rounded-md border bg-background text-sm w-40"
                />
                <Button variant="outline" size="sm" onClick={disableTotp}>
                  Kapat
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={startTotpEnrollment}>
                Etkinleştir
              </Button>
            )}
          </div>

          {enrollment && (
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Authenticator uygulamanızla QR kodu okutun (veya secret’ı girin), sonra 6 haneli kodu yazın.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div
                  className="bg-white rounded p-2 border"
                  aria-label="QR Code"
                  dangerouslySetInnerHTML={{
                    __html: enrollment.qrSvg.replace(/<script[\s\S]*?<\/script>/gi, '')
                  }}
                />

                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Secret</p>
                    <p className="text-xs text-muted-foreground break-all">{enrollment.secret}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="123456"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="h-9 px-3 rounded-md border bg-background text-sm w-40"
                    />
                    <Button size="sm" onClick={verifyTotpEnrollment}>
                      Doğrula
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEnrollment(null)
                        setVerificationCode('')
                      }}
                    >
                      Vazgeç
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Oturum Geçmişi</p>
              <p className="text-sm text-muted-foreground">Aktif oturumları görüntüle ve yönet</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Yakında
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Veri İndir</p>
              <p className="text-sm text-muted-foreground">Hesap verilerini indir (JSON)</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadUserData} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Dil ve Bölge
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dil</p>
              <p className="text-sm text-muted-foreground">Arayüz dili</p>
            </div>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="h-9 px-3 rounded-md border bg-background text-sm w-40"
            >
              {LOCALE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Para Birimi</p>
              <p className="text-sm text-muted-foreground">Fiyatların görüntüleneceği para birimi</p>
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-9 px-3 rounded-md border bg-background text-sm w-40"
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={saveProfileSettings} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Değişiklikleri Kaydet'}
        </Button>
      </div>
    </div>
  )
}

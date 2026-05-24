'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@novagross/ui'
import { createClient } from '@/lib/supabase/client'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function ChangePasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/giris')
        return
      }
      setUserEmail(user.email || '')
      setLoading(false)
    }
    checkAuth()
  }, [])

  const passwordStrength = (pw: string) => {
    let score = 0
    if (pw.length >= 8) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[a-z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    return score
  }

  const strength = passwordStrength(newPassword)
  const strengthLabel = strength <= 1 ? 'Zayıf' : strength <= 3 ? 'Orta' : 'Güçlü'
  const strengthColor = strength <= 1 ? 'bg-red-500' : strength <= 3 ? 'bg-yellow-500' : 'bg-green-500'

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Şifre en az 8 karakter olmalıdır.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Şifreler eşleşmiyor.' })
      return
    }
    if (strength < 3) {
      setMessage({ type: 'error', text: 'Lütfen daha güçlü bir şifre belirleyin (büyük harf, küçük harf ve rakam içermeli).' })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Şifreniz başarıyla güncellendi!' })
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      setMessage({ type: 'error', text: 'Bir hata oluştu. Lütfen tekrar deneyin.' })
    } finally {
      setSaving(false)
    }
  }

  const handleSendResetEmail = async () => {
    setSendingReset(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/hesabim/sifre-degistir`,
      })
      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: `Şifre sıfırlama bağlantısı ${userEmail} adresine gönderildi.` })
      }
    } catch {
      setMessage({ type: 'error', text: 'E-posta gönderilemedi. Lütfen tekrar deneyin.' })
    } finally {
      setSendingReset(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Şifre Değiştir</h1>

      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Yeni Şifre Belirle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="text-sm font-medium">
                Yeni Şifre
              </label>
              <div className="relative mt-1">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Yeni şifrenizi girin"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${strengthColor} transition-all`} style={{ width: `${(strength / 5) * 100}%` }} />
                    </div>
                    <span className={`text-xs font-medium ${strength <= 1 ? 'text-red-600' : strength <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {strengthLabel}
                    </span>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam içermelidir.
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Yeni Şifre (Tekrar)
              </label>
              <div className="relative mt-1">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Yeni şifrenizi tekrar girin"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-600 mt-1">Şifreler eşleşmiyor.</p>
              )}
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Güçlü Şifre Önerileri:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• En az 8 karakter kullanın</li>
                <li>• Büyük ve küçük harfleri birlikte kullanın</li>
                <li>• Rakam ve özel karakterler ekleyin</li>
                <li>• Kolayca tahmin edilebilecek kelimelerden kaçının</li>
                <li>• Farklı hesaplarınızda aynı şifreyi kullanmayın</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Güncelleniyor...</>
                ) : (
                  'Şifreyi Güncelle'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/hesabim')}>
                İptal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <h3 className="font-medium mb-2">Şifremi Unuttum</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Mevcut şifrenizi hatırlamıyorsanız, <strong>{userEmail}</strong> adresine şifre sıfırlama bağlantısı gönderebiliriz.
          </p>
          <Button variant="outline" onClick={handleSendResetEmail} disabled={sendingReset}>
            {sendingReset ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Gönderiliyor...</>
            ) : (
              'Şifre Sıfırlama E-postası Gönder'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

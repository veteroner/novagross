'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@novagross/ui'
import { getInitials } from '@novagross/utils'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Check, AlertCircle } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })

  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/giris')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile({
        firstName: profileData?.first_name || '',
        lastName: profileData?.last_name || '',
        email: user.email || '',
        phone: profileData?.phone || '',
      })
      setLoading(false)
    }

    loadProfile()
  }, [])

  const handleSaveProfile = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.firstName.trim(),
          last_name: profile.lastName.trim(),
          phone: profile.phone.trim(),
        })
        .eq('id', user.id)

      if (error) throw error
      setMessage({ type: 'success', text: 'Profil başarıyla güncellendi' })
    } catch (err) {
      setMessage({ type: 'error', text: 'Profil güncellenirken bir hata oluştu' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordMessage(null)

    if (passwords.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Şifre en az 6 karakter olmalı' })
      return
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Şifreler eşleşmiyor' })
      return
    }

    setSavingPassword(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword,
      })

      if (error) throw error
      setPasswordMessage({ type: 'success', text: 'Şifre başarıyla güncellendi' })
      setPasswords({ newPassword: '', confirmPassword: '' })
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err instanceof Error ? err.message : 'Şifre güncellenirken bir hata oluştu' })
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profil Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
              {getInitials(profile.firstName, profile.lastName)}
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile.firstName} {profile.lastName}</h2>
              <p className="text-muted-foreground">{profile.email}</p>
            </div>
          </div>

          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Ad</label>
                <Input
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Soyad</label>
                <Input
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">E-posta</label>
                <Input type="email" value={profile.email} disabled />
              </div>
              <div>
                <label className="text-sm font-medium">Telefon</label>
                <Input
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>
            </div>

            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : 'Kaydet'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Şifre Değiştir</CardTitle>
        </CardHeader>
        <CardContent>
          {passwordMessage && (
            <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
              passwordMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {passwordMessage.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span className="text-sm">{passwordMessage.text}</span>
            </div>
          )}

          <div className="space-y-4 max-w-md">
            <div>
              <label className="text-sm font-medium">Yeni Şifre</label>
              <Input
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                placeholder="En az 6 karakter"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Yeni Şifre (Tekrar)</label>
              <Input
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                placeholder="Şifreyi tekrar girin"
              />
            </div>
            <Button onClick={handleChangePassword} disabled={savingPassword}>
              {savingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Güncelleniyor...
                </>
              ) : 'Şifreyi Güncelle'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

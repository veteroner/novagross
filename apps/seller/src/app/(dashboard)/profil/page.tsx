'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@novagross/ui'
import { Button } from '@novagross/ui'
import { Input } from '@novagross/ui'
import { User, Save, Loader2, Shield, Mail, Phone, Key } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    avatar_url: '',
  })

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new_password: '',
    confirm: '',
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setFormData({
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        email: user.email || '',
        phone: profile?.phone || user.phone || '',
        avatar_url: profile?.avatar_url || '',
      })
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Update profiles table
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (dbError) throw dbError

      // Update auth metadata
      await supabase.auth.updateUser({
        data: { full_name: `${formData.first_name} ${formData.last_name}`.trim() },
      })

      alert('Profil güncellendi!')
    } catch (error: any) {
      console.error('Profile update error:', error)
      alert(error.message || 'Güncelleme başarısız')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordForm.new_password !== passwordForm.confirm) {
      alert('Yeni şifreler eşleşmiyor!')
      return
    }

    if (passwordForm.new_password.length < 8) {
      alert('Şifre en az 8 karakter olmalı')
      return
    }

    setChangingPassword(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new_password,
      })

      if (error) throw error

      alert('Şifre değiştirildi!')
      setPasswordForm({ current: '', new_password: '', confirm: '' })
    } catch (error: any) {
      console.error('Password change error:', error)
      alert(error.message || 'Şifre değiştirilemedi')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Profil</h1>
        <p className="text-gray-600">Kişisel bilgilerinizi yönetin</p>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Kişisel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ad</label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Ad"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Soyad</label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Soyad"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">E-posta</label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <Input value={formData.email} disabled className="bg-gray-50 flex-1" />
              </div>
              <p className="text-xs text-gray-500 mt-1">E-posta değiştirilemez</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Telefon</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+90 5XX XXX XXXX"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Kaydet
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Password Change */}
      <form onSubmit={handleChangePassword} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> Şifre Değiştir</CardTitle>
            <CardDescription>Güvenliğiniz için güçlü bir şifre kullanın</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Yeni Şifre</label>
              <Input
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                placeholder="En az 8 karakter"
                minLength={8}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Yeni Şifre (Tekrar)</label>
              <Input
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                placeholder="Şifreyi tekrar girin"
                minLength={8}
                required
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={changingPassword} variant="outline" className="flex items-center gap-2">
                {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                Şifreyi Değiştir
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

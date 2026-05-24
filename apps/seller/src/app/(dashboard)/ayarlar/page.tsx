'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@novagross/ui'
import { Button } from '@novagross/ui'
import { Settings, Bell, Globe, Palette, Save, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [settings, setSettings] = useState({
    email_new_order: true,
    email_order_status: true,
    email_low_stock: true,
    email_weekly_report: false,
    email_platform_updates: true,
    language: 'tr',
    currency: 'TRY',
    auto_accept_orders: false,
    low_stock_threshold: '5',
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!store) return

      const { data: prefs } = await (supabase as any)
        .from('seller_preferences')
        .select('*')
        .eq('store_id', store.id)
        .single()

      if (prefs) {
        setSettings({
          email_new_order: prefs.email_new_order ?? true,
          email_order_status: prefs.email_order_status ?? true,
          email_low_stock: prefs.email_low_stock ?? true,
          email_weekly_report: prefs.email_weekly_report ?? false,
          email_platform_updates: prefs.email_platform_updates ?? true,
          language: prefs.language || 'tr',
          currency: prefs.currency || 'TRY',
          auto_accept_orders: prefs.auto_accept_orders ?? false,
          low_stock_threshold: (prefs.low_stock_threshold ?? 5).toString(),
        })
      }
    } catch (error) {
      // Preferences table might not exist yet - use defaults
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!store) return

      const { error } = await (supabase as any)
        .from('seller_preferences')
        .upsert({
          store_id: store.id,
          ...settings,
          low_stock_threshold: parseInt(settings.low_stock_threshold),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'store_id' })

      if (error) throw error

      alert('Ayarlar kaydedildi!')
    } catch (error: any) {
      console.error('Settings save error:', error)
      alert(error.message || 'Ayarlar kaydedilemedi')
    } finally {
      setSaving(false)
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
        <h1 className="text-3xl font-bold mb-2">Ayarlar</h1>
        <p className="text-gray-600">Bildirim ve genel tercihleri yönetin</p>
      </div>

      <div className="space-y-6">
        {/* E-posta Bildirimleri */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> E-posta Bildirimleri</CardTitle>
            <CardDescription>Hangi durumlarda e-posta almak istersiniz?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'email_new_order', label: 'Yeni sipariş geldiğinde', desc: 'Her yeni siparişte e-posta alın' },
              { key: 'email_order_status', label: 'Sipariş durumu değiştiğinde', desc: 'İptal, iade gibi durumlarda bildirim' },
              { key: 'email_low_stock', label: 'Stok azaldığında', desc: 'Ürün stoğu eşik değerinin altına düştüğünde' },
              { key: 'email_weekly_report', label: 'Haftalık rapor', desc: 'Her pazartesi satış özeti' },
              { key: 'email_platform_updates', label: 'Platform güncellemeleri', desc: 'Novagross yeni özellik ve duyuruları' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={(settings as any)[item.key]}
                    onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: e.target.checked }))}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Sipariş Ayarları */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> Sipariş Ayarları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-sm">Otomatik sipariş kabul</p>
                <p className="text-xs text-gray-500">Siparişleri otomatik olarak &quot;İşleniyor&quot; durumuna al</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.auto_accept_orders}
                  onChange={(e) => setSettings(prev => ({ ...prev, auto_accept_orders: e.target.checked }))}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Varsayılan düşük stok eşiği</label>
              <input
                type="number"
                min="1"
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                value={settings.low_stock_threshold}
                onChange={(e) => setSettings(prev => ({ ...prev, low_stock_threshold: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">Bu değerin altına düşen ürünler için uyarı alırsınız</p>
            </div>
          </CardContent>
        </Card>

        {/* Genel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5" /> Genel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Dil</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={settings.language}
                  onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                >
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Para Birimi</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={settings.currency}
                  onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
                >
                  <option value="TRY">TRY (₺)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Ayarları Kaydet
          </Button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@novagross/ui'
import { Button } from '@novagross/ui'
import { Input } from '@novagross/ui'
import { Store, Save, Loader2, Image as ImageIcon, MapPin, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function StoreSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    store_name: '',
    store_slug: '',
    description: '',
    logo_url: '',
    banner_url: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    district: '',
    tax_number: '',
    tax_office: '',
    iban: '',
    company_name: '',
    account_holder: '',
    bank_name: '',
  })

  useEffect(() => {
    fetchStore()
  }, [])

  const fetchStore = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: store } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (!store) return
      setStoreId(store.id)

      setFormData({
        store_name: store.store_name || '',
        store_slug: store.store_slug || '',
        description: store.description || '',
        logo_url: store.logo_url || '',
        banner_url: store.banner_url || '',
        phone: store.phone || '',
        email: store.email || '',
        address: store.address || '',
        city: store.city || '',
        district: store.district || '',
        tax_number: store.tax_number || '',
        tax_office: store.tax_office || '',
        iban: store.iban || '',
        company_name: store.company_name || '',
        account_holder: store.account_holder || '',
        bank_name: store.bank_name || '',
      })

      if (store.logo_url) setLogoPreview(store.logo_url)
    } catch (error) {
      console.error('Failed to fetch store:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeId) return

    setSaving(true)

    try {
      const supabase = createClient()

      let logoUrl = formData.logo_url

      // Upload new logo if selected
      if (logoFile) {
        const fileName = `stores/${storeId}/logo-${Date.now()}-${logoFile.name}`
        const { error: uploadError, data } = await supabase.storage
          .from('store-assets')
          .upload(fileName, logoFile, { cacheControl: '3600', upsert: true })

        if (uploadError) throw new Error(`Logo yükleme hatası: ${uploadError.message}`)

        if (data) {
          const { data: urlData } = supabase.storage.from('store-assets').getPublicUrl(fileName)
          logoUrl = urlData.publicUrl
        }
      }

      const { error } = await supabase
        .from('stores')
        .update({
          store_name: formData.store_name,
          description: formData.description,
          logo_url: logoUrl,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          city: formData.city || null,
          district: formData.district || null,
          tax_number: formData.tax_number || null,
          tax_office: formData.tax_office || null,
          iban: formData.iban || null,
          company_name: formData.company_name || null,
          account_holder: formData.account_holder || null,
          bank_name: formData.bank_name || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', storeId)

      if (error) throw error

      alert('Mağaza bilgileri güncellendi!')
    } catch (error: any) {
      console.error('Failed to update store:', error)
      alert(error.message || 'Güncelleme başarısız')
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mağaza Ayarları</h1>
        <p className="text-gray-600">Mağaza bilgilerinizi düzenleyin</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Temel Bilgiler */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Store className="w-5 h-5" /> Mağaza Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Mağaza Adı *</label>
                <Input value={formData.store_name} onChange={(e) => setFormData(prev => ({ ...prev, store_name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Slug (URL)</label>
                <Input value={formData.store_slug} disabled className="bg-gray-50" />
                <p className="text-xs text-gray-500 mt-1">Slug değiştirilemez</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Mağaza Açıklaması</label>
              <textarea
                className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Mağazanız hakkında kısa bir açıklama"
              />
            </div>

            {/* Logo */}
            <div>
              <label className="block text-sm font-medium mb-2">Mağaza Logosu</label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-20 h-20 object-cover rounded-lg border" />
                ) : (
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <Input type="file" accept="image/*" onChange={handleLogoChange} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* İletişim */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5" /> İletişim Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Telefon</label>
                <Input value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} placeholder="+90 5XX XXX XXXX" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">E-posta</label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} placeholder="magaza@email.com" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Adres */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" /> Adres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Adres</label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Sokak, mahalle, bina no"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">İl</label>
                <Input value={formData.city} onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))} placeholder="İstanbul" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">İlçe</label>
                <Input value={formData.district} onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))} placeholder="Kadıköy" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vergi & Banka */}
        <Card>
          <CardHeader>
            <CardTitle>Vergi ve Banka Bilgileri</CardTitle>
            <CardDescription>Ödeme almak için gerekli bilgiler</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Şirket Adı</label>
                <Input value={formData.company_name} onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))} placeholder="Şirket Adı" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Vergi Numarası</label>
                <Input value={formData.tax_number} onChange={(e) => setFormData(prev => ({ ...prev, tax_number: e.target.value }))} placeholder="1234567890" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Vergi Dairesi</label>
                <Input value={formData.tax_office} onChange={(e) => setFormData(prev => ({ ...prev, tax_office: e.target.value }))} placeholder="Kadıköy V.D." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hesap Sahibi</label>
                <Input value={formData.account_holder} onChange={(e) => setFormData(prev => ({ ...prev, account_holder: e.target.value }))} placeholder="Ad Soyad" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Banka Adı</label>
                <Input value={formData.bank_name} onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))} placeholder="Ziraat Bankası" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">IBAN</label>
              <Input value={formData.iban} onChange={(e) => setFormData(prev => ({ ...prev, iban: e.target.value }))} placeholder="TR00 0000 0000 0000 0000 0000 00" className="font-mono" />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="flex items-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </Button>
        </div>
      </form>
    </div>
  )
}

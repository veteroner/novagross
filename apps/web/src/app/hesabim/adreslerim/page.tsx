'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, Badge, Button, Input } from '@novagross/ui'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Plus, Edit, Trash2, X, Check, Loader2 } from 'lucide-react'
import { AddressPicker, EMPTY_ADDRESS, type AddressValue } from '@/components/address/address-picker'

// AddressPicker (yapısal) → addresses tablosu (address_line1/line2) eşlemesi
function composeAddressLines(a: AddressValue) {
  const line1 = [
    a.neighborhood ? `${a.neighborhood} Mah.` : '',
    a.address,
    a.building_no ? `No: ${a.building_no}` : '',
  ].filter(Boolean).join(' ').trim()
  const line2 = [
    a.floor ? `Kat: ${a.floor}` : '',
    a.apartment_no ? `Daire: ${a.apartment_no}` : '',
    a.description,
  ].filter(Boolean).join(' ').trim()
  return { line1, line2 }
}

interface Address {
  id: string
  title: string
  first_name: string
  last_name: string
  phone: string
  address_line1: string
  address_line2: string | null
  city: string
  district: string
  postal_code: string | null
  is_default: boolean | null
  address_type: string | null
}

const EMPTY_FORM = {
  title: '',
  first_name: '',
  last_name: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  district: '',
  postal_code: '',
  is_default: false,
  address_type: 'both' as string,
}

export default function AddressesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [addressValue, setAddressValue] = useState<AddressValue>(EMPTY_ADDRESS)

  const fetchAddresses = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/giris')
      return
    }

    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (!error && data) {
      setAddresses(data as Address[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAddresses()
  }, [])

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const openAddForm = () => {
    setFormData(EMPTY_FORM)
    setAddressValue(EMPTY_ADDRESS)
    setEditingId(null)
    setShowForm(true)
    setError(null)
  }

  const openEditForm = (address: Address) => {
    setFormData({
      title: address.title,
      first_name: address.first_name,
      last_name: address.last_name,
      phone: address.phone,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      city: address.city,
      district: address.district,
      postal_code: address.postal_code || '',
      is_default: address.is_default || false,
      address_type: address.address_type || 'both',
    })
    // Mevcut kayıt → picker: il/ilçe/posta net; sokak satırı 'address' alanına gelir
    setAddressValue({
      ...EMPTY_ADDRESS,
      city: address.city || '',
      district: address.district || '',
      address: address.address_line1 || '',
      description: address.address_line2 || '',
      postal_code: address.postal_code || '',
    })
    setEditingId(address.id)
    setShowForm(true)
    setError(null)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData(EMPTY_FORM)
    setAddressValue(EMPTY_ADDRESS)
    setError(null)
  }

  const validateForm = () => {
    if (!formData.title.trim()) return 'Adres başlığı gerekli'
    if (!formData.first_name.trim()) return 'Ad gerekli'
    if (!formData.last_name.trim()) return 'Soyad gerekli'
    if (!formData.phone.trim()) return 'Telefon gerekli'
    if (!addressValue.city.trim()) return 'İl seçin'
    if (!addressValue.district.trim()) return 'İlçe seçin'
    if (!addressValue.address.trim()) return 'Cadde / Sokak gerekli'
    if (!addressValue.building_no.trim()) return 'Bina no gerekli'
    return null
  }

  const handleSave = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/giris')
        return
      }

      const { line1, line2 } = composeAddressLines(addressValue)
      const addressData = {
        user_id: user.id,
        title: formData.title.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim(),
        address_line1: line1,
        address_line2: line2 || null,
        city: addressValue.city.trim(),
        district: addressValue.district.trim(),
        postal_code: addressValue.postal_code.trim() || null,
        is_default: formData.is_default,
        address_type: formData.address_type,
      }

      // If setting as default, unset other defaults first
      if (formData.is_default) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id)
      }

      if (editingId) {
        // Update
        const { error } = await supabase
          .from('addresses')
          .update(addressData)
          .eq('id', editingId)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // Insert - if first address, make it default
        if (addresses.length === 0) {
          addressData.is_default = true
        }
        const { error } = await supabase
          .from('addresses')
          .insert(addressData)

        if (error) {
          if (error.message.includes('limit') || error.message.includes('10')) {
            throw new Error('En fazla 10 adres ekleyebilirsiniz')
          }
          throw error
        }
      }

      closeForm()
      await fetchAddresses()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error

      setDeleteConfirm(null)
      await fetchAddresses()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silme işlemi başarısız')
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Unset all defaults
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)

      // Set new default
      await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', id)
        .eq('user_id', user.id)

      await fetchAddresses()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Varsayılan ayarlanamadı')
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Adreslerim</h1>
        {!showForm && (
          <Button onClick={openAddForm}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Adres Ekle
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Address Form */}
      {showForm && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">
                {editingId ? 'Adresi Düzenle' : 'Yeni Adres'}
              </h2>
              <button onClick={closeForm} className="p-1 hover:bg-muted rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-sm font-medium">Adres Başlığı</label>
              <Input
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Ev, İş, vb."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Ad</label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  placeholder="Adınız"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Soyad</label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  placeholder="Soyadınız"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Telefon</label>
              <Input
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="05XX XXX XX XX"
              />
            </div>

            {/* İl/ilçe listeden seçim + konumla otomatik doldurma */}
            <div className="border rounded-lg p-3 bg-muted/30">
              <AddressPicker value={addressValue} onChange={setAddressValue} />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => handleChange('is_default', e.target.checked)}
                />
                <span className="text-sm">Varsayılan adres olarak ayarla</span>
              </label>

              <select
                className="text-sm border rounded-md px-3 py-1.5"
                value={formData.address_type}
                onChange={(e) => handleChange('address_type', e.target.value)}
              >
                <option value="both">Teslimat & Fatura</option>
                <option value="shipping">Teslimat</option>
                <option value="billing">Fatura</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {editingId ? 'Güncelle' : 'Kaydet'}
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={closeForm}>
                İptal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Addresses List */}
      {addresses.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Henüz kayıtlı adresiniz bulunmuyor.</p>
            <Button onClick={openAddForm}>
              <Plus className="w-4 h-4 mr-2" />
              İlk Adresinizi Ekleyin
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{address.title}</h3>
                    {address.is_default && (
                      <Badge variant="default">Varsayılan</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground mb-4">
                  <p className="font-medium text-foreground">{address.first_name} {address.last_name}</p>
                  <p>
                    {address.address_line1}
                    {address.address_line2 ? ` ${address.address_line2}` : ''}
                  </p>
                  <p>{address.district} / {address.city}</p>
                  {address.postal_code && <p>Posta Kodu: {address.postal_code}</p>}
                  <p>{address.phone}</p>
                </div>

                {deleteConfirm === address.id ? (
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-red-600 flex-1">Silmek istediğinize emin misiniz?</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(address.id)}
                    >
                      Evet, Sil
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirm(null)}
                    >
                      İptal
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditForm(address)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Düzenle
                    </Button>
                    {!address.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(address.id)}
                      >
                        Varsayılan Yap
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirm(address.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

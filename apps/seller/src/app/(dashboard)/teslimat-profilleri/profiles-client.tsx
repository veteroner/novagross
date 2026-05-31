'use client'

import { useState, useTransition } from 'react'
import { Card, Badge, Button, Input } from '@novagross/ui'
import { Truck, Loader2, Power, Save } from 'lucide-react'
import { upsertShippingProfile, toggleProfileActive } from './actions'

export type ShippingMethod = {
  id: string
  name: string
  code: string
  description: string | null
  estimated_delivery_days: number | null
  estimated_delivery_days_max: number | null
  carrier?: { name: string } | null
}

export type ShippingProfileRow = {
  method_id: string
  custom_base_price: number | null
  custom_free_shipping_threshold: number | null
  processing_time_days: number | null
  is_enabled: boolean
}

export function ProfilesClient({
  methods,
  profiles,
}: {
  methods: ShippingMethod[]
  profiles: ShippingProfileRow[]
}) {
  const profileByMethodId = new Map<string, ShippingProfileRow>()
  for (const p of profiles) profileByMethodId.set(p.method_id, p)

  return (
    <div className="space-y-4">
      {methods.map((m) => {
        const existing = profileByMethodId.get(m.id)
        return (
          <ProfileCard
            key={m.id}
            method={m}
            profile={
              existing ?? {
                method_id: m.id,
                custom_base_price: null,
                custom_free_shipping_threshold: null,
                processing_time_days: 1,
                is_enabled: false,
              }
            }
          />
        )
      })}
    </div>
  )
}

function ProfileCard({
  method,
  profile,
}: {
  method: ShippingMethod
  profile: ShippingProfileRow
}) {
  const [basePrice, setBasePrice] = useState<number | null>(profile.custom_base_price)
  const [freeThreshold, setFreeThreshold] = useState<number | null>(
    profile.custom_free_shipping_threshold
  )
  const [processingDays, setProcessingDays] = useState<number>(
    profile.processing_time_days ?? 1
  )
  const [isEnabled, setIsEnabled] = useState<boolean>(profile.is_enabled)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [isPending, startTransition] = useTransition()

  const onSave = () => {
    setError(null)
    startTransition(async () => {
      try {
        await upsertShippingProfile({
          method_id: method.id,
          custom_base_price: basePrice,
          custom_free_shipping_threshold: freeThreshold,
          processing_time_days: processingDays,
          is_enabled: isEnabled,
        })
        setSavedAt(new Date())
      } catch (err: any) {
        setError(err?.message ?? 'Kayıt başarısız.')
      }
    })
  }

  const onToggle = () => {
    startTransition(async () => {
      try {
        await toggleProfileActive(method.id, !isEnabled)
        setIsEnabled(!isEnabled)
      } catch (err: any) {
        setError(err?.message ?? 'İşlem başarısız.')
      }
    })
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Truck className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">{method.name}</h3>
            {method.carrier?.name && (
              <Badge variant="outline">{method.carrier.name}</Badge>
            )}
            {isEnabled ? (
              <Badge variant="success">Aktif</Badge>
            ) : (
              <Badge variant="secondary">Pasif</Badge>
            )}
          </div>
          {method.description && (
            <p className="text-sm text-gray-600">{method.description}</p>
          )}
          {(method.estimated_delivery_days || method.estimated_delivery_days_max) && (
            <p className="text-xs text-gray-500 mt-0.5">
              Tahmini teslimat: {method.estimated_delivery_days ?? '?'} -{' '}
              {method.estimated_delivery_days_max ?? '?'} gün
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant={isEnabled ? 'outline' : 'default'}
          onClick={onToggle}
          disabled={isPending}
          style={isEnabled ? {} : { backgroundColor: '#16A34A' }}
          className={isEnabled ? '' : 'text-white'}
        >
          <Power className="h-3 w-3 mr-1" />
          {isEnabled ? 'Pasifleştir' : 'Aktifleştir'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-600 block mb-1">
            Özel Kargo Ücreti (₺)
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={basePrice ?? ''}
            onChange={(e) =>
              setBasePrice(e.target.value === '' ? null : Number(e.target.value))
            }
            placeholder="Sistem varsayılanı"
            disabled={isPending}
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 block mb-1">
            Ücretsiz Kargo Limiti (₺)
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={freeThreshold ?? ''}
            onChange={(e) =>
              setFreeThreshold(
                e.target.value === '' ? null : Number(e.target.value)
              )
            }
            placeholder="Yok"
            disabled={isPending}
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 block mb-1">
            Hazırlama Süresi (gün)
          </label>
          <Input
            type="number"
            min="0"
            max="30"
            value={processingDays}
            onChange={(e) => setProcessingDays(Number(e.target.value))}
            disabled={isPending}
          />
        </div>
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {error}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {savedAt
            ? `Kaydedildi: ${savedAt.toLocaleTimeString('tr-TR')}`
            : 'Değişiklikleri kaydetmeyi unutmayın.'}
        </p>
        <Button
          size="sm"
          onClick={onSave}
          disabled={isPending}
          style={{ backgroundColor: '#16A34A' }}
          className="text-white"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Save className="h-3 w-3 mr-1" />
          )}
          Kaydet
        </Button>
      </div>
    </Card>
  )
}

'use client'

import { useTransition } from 'react'
import { Badge, Button } from '@novagross/ui'
import { Loader2, Pause, Play, Trash2 } from 'lucide-react'
import { deleteAdCampaign, updateAdCampaignStatus } from './actions'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Onay Bekliyor',
  approved: 'Onaylı',
  rejected: 'Reddedildi',
  paused: 'Duraklatıldı',
  expired: 'Süresi Doldu',
}
const STATUS_VARIANT: Record<string, any> = {
  pending: 'default',
  approved: 'success',
  rejected: 'destructive',
  paused: 'secondary',
  expired: 'secondary',
}

const AD_TYPE_LABEL: Record<string, string> = {
  sponsored_product: 'Sponsorlu Ürün',
  sponsored_brand: 'Sponsorlu Marka',
  sponsored_category: 'Sponsorlu Kategori',
}

export function CampaignRow({ c }: { c: any }) {
  const [isPending, startTransition] = useTransition()

  const toggle = () =>
    startTransition(async () => {
      try {
        await updateAdCampaignStatus(c.id, !c.is_active)
      } catch (e: any) {
        alert(e?.message ?? 'Güncelleme başarısız.')
      }
    })

  const onDelete = () => {
    if (!confirm(`"${c.name}" kampanyasını silmek istediğinizden emin misiniz?`)) return
    startTransition(async () => {
      try {
        await deleteAdCampaign(c.id)
      } catch (e: any) {
        alert(e?.message ?? 'Silme başarısız.')
      }
    })
  }

  return (
    <tr className="border-b hover:bg-green-50/30">
      <td className="py-3 px-4">
        <div className="font-medium text-gray-900">{c.name}</div>
        {c.rejection_reason && (
          <div className="text-xs text-red-600 mt-1">
            Red: {c.rejection_reason}
          </div>
        )}
      </td>
      <td className="py-3 px-4 text-sm text-gray-700">
        {AD_TYPE_LABEL[c.ad_type] ?? c.ad_type}
      </td>
      <td className="py-3 px-4 text-sm">
        <div>₺{Number(c.daily_budget).toFixed(2)}/gün</div>
        <div className="text-xs text-gray-500">
          tıklama: ₺{Number(c.bid_per_click).toFixed(2)}
        </div>
      </td>
      <td className="py-3 px-4 text-sm">
        <div>{c.impressions ?? 0} gösterim</div>
        <div className="text-xs text-gray-500">
          {c.clicks ?? 0} tıklama · CTR %{c.ctr_percent ?? 0}
        </div>
      </td>
      <td className="py-3 px-4 text-sm">
        ₺{Number(c.spent_total ?? 0).toFixed(2)}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1">
          <Badge variant={STATUS_VARIANT[c.status] ?? 'default'}>
            {STATUS_LABEL[c.status] ?? c.status}
          </Badge>
          {!c.is_active && c.status === 'approved' && (
            <Badge variant="secondary" className="text-xs">
              Pasif
            </Badge>
          )}
        </div>
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          {c.status === 'approved' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggle}
              disabled={isPending}
              title={c.is_active ? 'Duraklat' : 'Devam ettir'}
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : c.is_active ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={isPending}
            className="text-red-600 hover:bg-red-50"
            title="Sil"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

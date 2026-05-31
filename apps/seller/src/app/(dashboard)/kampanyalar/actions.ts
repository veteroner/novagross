'use server'

import { revalidatePath } from 'next/cache'
import { requireSeller } from '@/lib/auth/requireSeller'

export type CampaignInput = {
  name: string
  description?: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_amount?: number | null
  max_discount?: number | null
  target_type: 'all_products' | 'specific_products' | 'category'
  product_ids?: string[]
  category_ids?: string[]
  starts_at?: string | null
  ends_at?: string | null
  is_active: boolean
}

function validate(input: CampaignInput) {
  if (!input.name?.trim()) throw new Error('Kampanya adı gerekli.')
  if (!['percentage', 'fixed'].includes(input.discount_type))
    throw new Error('Geçersiz indirim tipi.')
  if (!Number.isFinite(input.discount_value) || input.discount_value <= 0)
    throw new Error("İndirim değeri 0'dan büyük olmalı.")
  if (input.discount_type === 'percentage' && input.discount_value > 100)
    throw new Error("Yüzde indirim 100'den büyük olamaz.")
  if (input.target_type === 'specific_products' && !(input.product_ids?.length ?? 0))
    throw new Error('En az 1 ürün seçilmeli.')
  if (input.target_type === 'category' && !(input.category_ids?.length ?? 0))
    throw new Error('En az 1 kategori seçilmeli.')
}

function toRow(input: CampaignInput, storeId: string) {
  return {
    store_id: storeId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    discount_type: input.discount_type,
    discount_value: input.discount_value,
    min_order_amount: input.min_order_amount ?? null,
    max_discount: input.max_discount ?? null,
    target_type: input.target_type,
    product_ids: input.product_ids ?? [],
    category_ids: input.category_ids ?? [],
    starts_at: input.starts_at || null,
    ends_at: input.ends_at || null,
    is_active: input.is_active,
    updated_at: new Date().toISOString(),
  }
}

export async function createCampaign(input: CampaignInput) {
  validate(input)
  const { supabase, storeId } = await requireSeller('/kampanyalar')
  const { error } = await (supabase as any).from('store_campaigns').insert(toRow(input, storeId))
  if (error) throw new Error(error.message)
  revalidatePath('/kampanyalar')
}

export async function updateCampaign(id: string, input: CampaignInput) {
  validate(input)
  const { supabase, storeId } = await requireSeller('/kampanyalar')
  const row = toRow(input, storeId)
  delete (row as any).store_id
  const { error } = await (supabase as any).from('store_campaigns').update(row).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/kampanyalar')
}

export async function toggleCampaignActive(id: string, isActive: boolean) {
  const { supabase } = await requireSeller('/kampanyalar')
  const { error } = await (supabase as any)
    .from('store_campaigns')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/kampanyalar')
}

export async function deleteCampaign(id: string) {
  const { supabase } = await requireSeller('/kampanyalar')
  const { error } = await (supabase as any).from('store_campaigns').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/kampanyalar')
}

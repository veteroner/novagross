'use server'

import { revalidatePath } from 'next/cache'
import { requireSeller } from '@/lib/auth/requireSeller'

export type CampaignInput = {
  name: string
  description?: string | null
  discount_type: 'percentage' | 'fixed' | 'bogo'
  discount_value?: number | null
  buy_quantity?: number | null
  get_quantity?: number | null
  min_order_amount?: number | null
  max_discount?: number | null
  usage_limit?: number | null
  target_type: 'all_products' | 'specific_products' | 'category'
  product_ids?: string[]
  category_ids?: string[]
  starts_at?: string | null
  ends_at?: string | null
  is_active: boolean
  public_slug?: string | null
}

/** Hepsi-style auto title generator. */
function generateAutoTitle(input: CampaignInput, storeName: string): string {
  const min = input.min_order_amount
  if (input.discount_type === 'percentage') {
    if (min)
      return `${storeName} satıcılı ürünlerde ${min} TL ve üzerine %${input.discount_value} indirim`
    return `${storeName} satıcılı ürünlerde %${input.discount_value} indirim`
  }
  if (input.discount_type === 'fixed') {
    if (min)
      return `${storeName} satıcılı ürünlerde ${min} TL ve üzerine ${input.discount_value} TL indirim`
    return `${storeName} satıcılı ürünlerde ${input.discount_value} TL indirim`
  }
  // BOGO
  return `${storeName} satıcılı seçili ürünlerde ${input.buy_quantity} al ${input.get_quantity} öde`
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function validate(input: CampaignInput) {
  if (!input.name?.trim()) throw new Error('Kampanya adı gerekli.')
  if (!['percentage', 'fixed', 'bogo'].includes(input.discount_type))
    throw new Error('Geçersiz indirim tipi.')

  if (input.discount_type === 'percentage' || input.discount_type === 'fixed') {
    if (!Number.isFinite(input.discount_value ?? NaN) || (input.discount_value ?? 0) <= 0)
      throw new Error("İndirim değeri 0'dan büyük olmalı.")
    if (input.discount_type === 'percentage' && (input.discount_value ?? 0) > 100)
      throw new Error("Yüzde indirim 100'den büyük olamaz.")
  }

  if (input.discount_type === 'bogo') {
    const bq = input.buy_quantity ?? 0
    const gq = input.get_quantity ?? 0
    if (bq < 2) throw new Error('BOGO için "al" miktarı en az 2 olmalı.')
    if (gq < 1) throw new Error('BOGO için "öde" miktarı en az 1 olmalı.')
    if (gq >= bq) throw new Error('"Öde" miktarı "al" miktarından küçük olmalı.')
  }

  if (input.target_type === 'specific_products' && !(input.product_ids?.length ?? 0))
    throw new Error('En az 1 ürün seçilmeli.')
  if (input.target_type === 'category' && !(input.category_ids?.length ?? 0))
    throw new Error('En az 1 kategori seçilmeli.')
}

async function buildRow(supabase: any, input: CampaignInput, storeId: string, storeName: string) {
  const auto_title = generateAutoTitle(input, storeName)
  const baseSlug =
    (input.public_slug?.trim() && slugify(input.public_slug)) || slugify(`${storeName}-${input.name}`)

  // Ensure slug uniqueness with -2, -3 etc.
  let slug = baseSlug
  for (let i = 2; i <= 25; i++) {
    const { data: existing } = await supabase
      .from('store_campaigns')
      .select('id')
      .eq('public_slug', slug)
      .maybeSingle()
    if (!existing) break
    slug = `${baseSlug}-${i}`
  }

  return {
    store_id: storeId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    auto_title,
    public_slug: slug,
    discount_type: input.discount_type,
    discount_value:
      input.discount_type === 'bogo' ? null : input.discount_value ?? null,
    buy_quantity: input.discount_type === 'bogo' ? input.buy_quantity ?? null : null,
    get_quantity: input.discount_type === 'bogo' ? input.get_quantity ?? null : null,
    min_order_amount: input.min_order_amount ?? null,
    max_discount: input.max_discount ?? null,
    usage_limit: input.usage_limit ?? null,
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
  const { supabase, storeId, storeName } = await requireSeller('/kampanyalar')
  const row = await buildRow(supabase as any, input, storeId, storeName)
  const { error } = await (supabase as any).from('store_campaigns').insert(row)
  if (error) throw new Error(error.message)
  revalidatePath('/kampanyalar')
}

export async function updateCampaign(id: string, input: CampaignInput) {
  validate(input)
  const { supabase, storeId, storeName } = await requireSeller('/kampanyalar')
  const row = await buildRow(supabase as any, input, storeId, storeName)
  delete (row as any).store_id
  // Slug stable on update unless user changed it explicitly
  if (input.public_slug && input.public_slug.trim()) {
    // keep generated slug
  } else {
    delete (row as any).public_slug
  }
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

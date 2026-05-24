import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { sendApplicationApprovedEmail } from '@novagross/database/email-utils'

export const dynamic = 'force-dynamic'

function normalizeSlugBase(input: string) {
  return String(input || '')
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function ensureUniqueStoreSlug(service: ReturnType<typeof createServiceRoleClient>, requested: string, ownerId: string) {
  const base = normalizeSlugBase(requested)
  if (!base) return 'magaza'

  // If the slug exists but belongs to this owner, we can reuse it.
  const existing = await service
    .from('stores')
    .select('id, owner_id, store_slug')
    .eq('store_slug', base)
    .maybeSingle()

  if (!existing.error && existing.data) {
    if (existing.data.owner_id === ownerId) return existing.data.store_slug
  } else if (existing.error) {
    throw existing.error
  } else {
    return base
  }

  // Otherwise, find an available suffix.
  for (let i = 2; i <= 50; i++) {
    const candidate = `${base}-${i}`
    const check = await service
      .from('stores')
      .select('id')
      .eq('store_slug', candidate)
      .maybeSingle()

    if (check.error) throw check.error
    if (!check.data) return candidate
  }

  // Fallback with timestamp
  return `${base}-${Date.now()}`
}

/**
 * Approve Seller Application
 * Uses shared approveStoreApplication helper for consistent logic across admin & UI
 */
export async function POST(req: NextRequest) {
  try {
    const { applicationId } = await req.json()

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    // Require logged-in user (cookie-based session)
    const sessionClient = await createClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role using service role (bypass RLS)
    const service = createServiceRoleClient()
    const { data: reviewerProfile, error: reviewerProfileError } = await service
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (reviewerProfileError) {
      return NextResponse.json({ error: reviewerProfileError.message }, { status: 500 })
    }

    const reviewerRole = (reviewerProfile as any)?.role
    if (reviewerRole !== 'admin' && reviewerRole !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const reviewerId = user.id

    // Fetch application
    const { data: application, error: fetchError } = await service
      .from('store_applications')
      .select('*')
      .eq('id', applicationId)
      .maybeSingle()

    if (fetchError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Idempotency: if already approved, just return the existing store (if any)
    if ((application as any).status === 'approved') {
      const { data: existingStore } = await service
        .from('stores')
        .select('id')
        .eq('owner_id', (application as any).user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return NextResponse.json({
        success: true,
        message: 'Application already approved',
        storeId: existingStore?.id ?? null,
      })
    }

    const ownerId = (application as any).user_id as string
    const requestedSlug = String((application as any).store_slug || (application as any).store_name || '')
    const storeSlug = await ensureUniqueStoreSlug(service, requestedSlug, ownerId)

    // Create or reuse store for this owner
    const { data: existingStoreForOwner, error: existingStoreError } = await service
      .from('stores')
      .select('id, store_slug')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingStoreError) {
      return NextResponse.json({ error: existingStoreError.message }, { status: 500 })
    }

    let storeId: string | undefined = existingStoreForOwner?.id ?? undefined
    let finalStoreSlug: string | undefined = existingStoreForOwner?.store_slug ?? undefined

    if (!storeId) {
      // Attempt insert, retry if slug collides due to race
      let inserted: any = null
      for (let attempt = 0; attempt < 3; attempt++) {
        const slugToUse = attempt === 0 ? storeSlug : await ensureUniqueStoreSlug(service, `${storeSlug}-${attempt + 1}`, ownerId)
        const { data: store, error: storeError } = await service
          .from('stores')
          .insert({
            owner_id: ownerId,
            store_name: (application as any).store_name,
            store_slug: slugToUse,
            description: (application as any).description,
            company_name: (application as any).company_name,
            tax_number: (application as any).tax_number,
            phone: (application as any).phone,
            email: (application as any).email,
            address: (application as any).address,
            city: (application as any).city,
            district: (application as any).district,
            postal_code: (application as any).postal_code,
            status: 'active',
            approved_at: new Date().toISOString(),
            approved_by: reviewerId,
          })
          .select('id, store_name, store_slug')
          .single()

        if (!storeError) {
          inserted = store
          break
        }

        // Unique violation
        if ((storeError as any)?.code === '23505') {
          continue
        }

        return NextResponse.json({ error: storeError.message }, { status: 500 })
      }

      if (!inserted?.id) {
        return NextResponse.json({ error: 'Failed to create store' }, { status: 500 })
      }

      storeId = inserted.id
      finalStoreSlug = inserted.store_slug
    }

    if (!storeId) {
      return NextResponse.json({ error: 'Failed to resolve store id' }, { status: 500 })
    }

    if (!finalStoreSlug) {
      finalStoreSlug = storeSlug
    }

    // Ensure store balance exists
    const { data: existingBalance, error: balanceSelectError } = await service
      .from('store_balance')
      .select('store_id')
      .eq('store_id', storeId)
      .maybeSingle()

    if (balanceSelectError) {
      return NextResponse.json({ error: balanceSelectError.message }, { status: 500 })
    }

    if (!existingBalance) {
      const { error: balanceInsertError } = await service
        .from('store_balance')
        .insert({
          store_id: storeId,
          available_balance: 0,
          pending_balance: 0,
          total_withdrawn: 0,
        })

      if (balanceInsertError) {
        return NextResponse.json({ error: balanceInsertError.message }, { status: 500 })
      }
    }

    // Mark profile as seller
    const { error: sellerFlagError } = await service
      .from('profiles')
      .update({ is_seller: true })
      .eq('id', ownerId)

    if (sellerFlagError) {
      return NextResponse.json({ error: sellerFlagError.message }, { status: 500 })
    }

    // Approve application
    const { error: appUpdateError } = await service
      .from('store_applications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
      })
      .eq('id', applicationId)

    if (appUpdateError) {
      return NextResponse.json({ error: appUpdateError.message }, { status: 500 })
    }

    // Send approval email (best-effort)
    try {
      const { data: ownerProfile } = await service
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', ownerId)
        .maybeSingle()

      const ownerEmail = ownerProfile?.email ?? (application as any).email
      if (ownerEmail) {
        const ownerName = ownerProfile?.first_name
          ? `${ownerProfile.first_name} ${ownerProfile.last_name || ''}`.trim()
          : 'Değerli Satıcımız'

        await sendApplicationApprovedEmail({
          email: ownerEmail,
          storeName: (application as any).store_name,
          storeSlug: finalStoreSlug,
          ownerName,
          storeId,
        })
      }
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: 'Application approved',
      storeId,
    })
  } catch (error: any) {
    console.error('Approve application error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve application' },
      { status: 500 }
    )
  }
}

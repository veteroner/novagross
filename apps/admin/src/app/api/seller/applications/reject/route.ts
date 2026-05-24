import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { sendApplicationRejectedEmail } from '@novagross/database/email-utils'

export const dynamic = 'force-dynamic'

/**
 * Reject Seller Application
 * Uses shared rejectStoreApplication helper for consistent logic
 */
export async function POST(req: NextRequest) {
  try {
    const { applicationId, reason, adminNotes } = await req.json()

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
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

    // Reject application (service role to avoid RLS)
    const { data: updatedApp, error: updateError } = await service
      .from('store_applications')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        admin_notes: adminNotes,
      })
      .eq('id', applicationId)
      .select('*')
      .maybeSingle()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!updatedApp) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Send rejection email (best-effort)
    try {
      const ownerId = (updatedApp as any).user_id as string
      const { data: ownerProfile } = await service
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', ownerId)
        .maybeSingle()

      const ownerEmail = ownerProfile?.email ?? (updatedApp as any).email
      if (ownerEmail) {
        const ownerName = ownerProfile?.first_name
          ? `${ownerProfile.first_name} ${ownerProfile.last_name || ''}`.trim()
          : 'Değerli Başvuru Sahibi'

        await sendApplicationRejectedEmail({
          email: ownerEmail,
          storeName: (updatedApp as any).store_name,
          ownerName,
          rejectionReason: reason,
        })
      }
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: 'Application rejected',
    })
  } catch (error: any) {
    console.error('Reject application error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reject application' },
      { status: 500 }
    )
  }
}

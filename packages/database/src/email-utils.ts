/**
 * Email utility functions for marketplace operations
 * These functions are used by database queries to send transactional emails
 */

type EmailParams = {
  to: string
  subject: string
  template: string
  data: Record<string, any>
}

/**
 * Send email via API route
 * This is a client-safe wrapper that calls the email service via API
 */
export async function sendTransactionalEmail(params: EmailParams): Promise<void> {
  try {
    const isServer = typeof window === 'undefined'
    const baseUrl = isServer ? process.env.NEXT_PUBLIC_SITE_URL : ''
    const url = `${baseUrl || ''}/api/email/send`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      throw new Error(`Email API error: ${response.statusText}`)
    }
  } catch (error) {
    // Log error but don't throw - email failures shouldn't block main operations
    console.error('Failed to send transactional email:', error)
    console.error('Email params:', { to: params.to, template: params.template })
  }
}

/**
 * Send seller application approved email
 */
export async function sendApplicationApprovedEmail(params: {
  email: string
  storeName: string
  storeSlug: string
  ownerName: string
  storeId?: string
}) {
  const loginUrl = process.env.NEXT_PUBLIC_ADMIN_URL 
    ? `${process.env.NEXT_PUBLIC_ADMIN_URL}/seller/dashboard`
    : 'https://admin.novagross.com/seller/dashboard'

  await sendTransactionalEmail({
    to: params.email,
    subject: `🎉 ${params.storeName} mağaza başvurunuz onaylandı!`,
    template: 'seller/application-approved',
    data: {
      applicantName: params.ownerName,
      storeName: params.storeName,
      storeSlug: params.storeSlug,
      loginUrl,
      storeId: params.storeId,
    },
  })
}

/**
 * Send seller application rejected email
 */
export async function sendApplicationRejectedEmail(params: {
  email: string
  storeName: string
  ownerName: string
  rejectionReason: string
}) {
  await sendTransactionalEmail({
    to: params.email,
    subject: `${params.storeName} mağaza başvurunuz hakkında`,
    template: 'seller/application-rejected',
    data: {
      storeName: params.storeName,
      ownerName: params.ownerName,
      rejectionReason: params.rejectionReason,
    },
  })
}

/**
 * Send product approved email
 */
export async function sendProductApprovedEmail(params: {
  email: string
  productName: string
  productSlug: string
  storeName: string
}) {
  await sendTransactionalEmail({
    to: params.email,
    subject: `✅ ${params.productName} ürününüz onaylandı!`,
    template: 'store/product-approved',
    data: {
      productName: params.productName,
      productSlug: params.productSlug,
      storeName: params.storeName,
    },
  })
}

/**
 * Send product rejected email
 */
export async function sendProductRejectedEmail(params: {
  email: string
  productName: string
  storeName: string
  rejectionReason: string
}) {
  await sendTransactionalEmail({
    to: params.email,
    subject: `${params.productName} ürün onay durumu`,
    template: 'store/product-rejected',
    data: {
      productName: params.productName,
      storeName: params.storeName,
      rejectionReason: params.rejectionReason,
    },
  })
}

/**
 * Send new order notification to seller
 */
export async function sendNewOrderEmail(params: {
  email: string
  orderNumber: string
  storeName: string
  customerName: string
  totalAmount: number
  itemsCount: number
}) {
  await sendTransactionalEmail({
    to: params.email,
    subject: `🎉 Yeni sipariş - ${params.orderNumber}`,
    template: 'store/new-order',
    data: {
      orderNumber: params.orderNumber,
      storeName: params.storeName,
      customerName: params.customerName,
      totalAmount: params.totalAmount,
      itemsCount: params.itemsCount,
    },
  })
}

/**
 * Send withdrawal processed email
 */
export async function sendWithdrawalProcessedEmail(params: {
  email: string
  storeName: string
  amount: number
  status: 'completed' | 'rejected'
  iban: string
  processedAt: string
  rejectionReason?: string
}) {
  await sendTransactionalEmail({
    to: params.email,
    subject: params.status === 'completed' 
      ? '✅ Para çekme işlemi tamamlandı'
      : '❌ Para çekme işlemi reddedildi',
    template: 'seller/withdrawal-processed',
    data: params,
  })
}

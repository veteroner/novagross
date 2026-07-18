// Email System Type Definitions

export type EmailTemplate =
  // Auth
  | 'auth/password-reset'
  | 'auth/password-changed'
  | 'auth/email-verification'
  | 'auth/otp-code'
  | 'auth/new-device'
  | 'auth/suspicious-activity'
  // Orders
  | 'orders/order-confirmation'
  | 'orders/order-shipped'
  | 'orders/order-delivered'
  | 'orders/order-cancelled'
  | 'orders/new-order-seller'
  | 'orders/order-reminder-seller'
  | 'orders/invoice-uploaded'
  | 'orders/return-request'
  // Finance
  | 'finance/payment-received'
  | 'finance/withdrawal-request'
  | 'finance/withdrawal-approved'
  | 'finance/withdrawal-completed'
  | 'finance/withdrawal-rejected'
  // Products
  | 'products/product-approved'
  | 'products/product-rejected'
  | 'products/stock-alert'
  | 'products/stock-empty'
  | 'products/new-product-admin'
  // Marketing
  | 'marketing/welcome'
  | 'marketing/campaign'
  | 'marketing/birthday'
  | 'marketing/abandoned-cart'
  | 'marketing/wishlist-discount'
  | 'marketing/recommendations'
  | 'marketing/review-request'
  | 'marketing/win-back'
  | 'marketing/welcome-series'
  | 'marketing/product-recommendations'
  | 'marketing/product-offer'
  // Seller (Marketplace)
  | 'seller/application-received'
  | 'seller/application-approved'
  | 'seller/application-rejected'
  | 'seller/withdrawal-processed'
  | 'seller/weekly-payout-processed'
  | 'seller/weekly-insights'
  | 'seller/store-invitation'
  // Store (Marketplace)
  | 'store/product-approved'
  | 'store/product-rejected'
  | 'store/new-order'
  // Admin
  | 'admin/critical-error'
  | 'admin/payment-error'
  | 'admin/daily-report'
  | 'admin/weekly-report'
  | 'admin/weekly-payout-summary'
  | 'admin/pending-withdrawals'
  | 'admin/suspicious-activity'
  | 'admin/maintenance'
  | 'admin/new-seller-application';

export type EmailPriority = 'low' | 'medium' | 'high' | 'critical';

export type EmailStatus = 
  | 'pending'
  | 'processing'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'complained'
  | 'failed';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  template: EmailTemplate;
  data: Record<string, any>;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface QueueEmailParams extends SendEmailParams {
  priority?: EmailPriority;
  scheduledAt?: Date;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface SendResult {
  success: boolean;
  id?: string;
  error?: string;
}

export interface EmailLog {
  id: string;
  user_id?: string;
  recipient: string;
  template: EmailTemplate;
  subject: string;
  status: EmailStatus;
  resend_id?: string;
  error?: string;
  data?: Record<string, any>;
  sent_at?: Date;
  delivered_at?: Date;
  opened_at?: Date;
  clicked_at?: Date;
  bounced_at?: Date;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface EmailPreferences {
  id: string;
  user_id: string;
  email: string;
  marketing: boolean;
  product_updates: boolean;
  order_updates: boolean;
  abandoned_cart: boolean;
  wishlist_alerts: boolean;
  review_requests: boolean;
  newsletters: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  unsubscribed_all: boolean;
  unsubscribed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface EmailQueueItem {
  id: string;
  recipient: string;
  template: EmailTemplate;
  subject: string;
  data: Record<string, any>;
  priority: EmailPriority;
  scheduled_at: Date;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  retry_count: number;
  last_error?: string;
  created_at: Date;
  updated_at: Date;
}

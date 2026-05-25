// Email Logging Utility

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import type { EmailTemplate, EmailStatus } from './types';

export class EmailLogger {
  /**
   * Log e-posta gönderimini veritabanına kaydet
   */
  static async log(params: {
    recipient: string;
    template: EmailTemplate;
    subject: string;
    status: EmailStatus;
    resendId?: string;
    error?: string;
    userId?: string;
    data?: Record<string, any>;
  }): Promise<void> {
    try {
      const supabase = createServiceRoleClient();
      
      await supabase.from('email_logs').insert({
        user_id: params.userId,
        recipient: params.recipient,
        template: params.template,
        subject: params.subject,
        status: params.status,
        resend_id: params.resendId,
        error: params.error,
        data: params.data,
        sent_at: params.status === 'sent' ? new Date().toISOString() : null,
      });
    } catch (error) {
      // Log hatası sessizce geç (email gönderimi başarılı olsa bile)
      console.error('Email logging failed:', error);
    }
  }

  /**
   * E-posta durumunu güncelle (webhook'lardan)
   */
  static async updateStatus(
    resendId: string,
    status: EmailStatus,
    timestamp?: Date
  ): Promise<void> {
    try {
      const supabase = createServiceRoleClient();
      
      const updateData: {
        status: EmailStatus
        delivered_at?: string
        opened_at?: string
        clicked_at?: string
        bounced_at?: string
      } = { status };

      if (timestamp) {
        switch (status) {
          case 'delivered':
            updateData.delivered_at = timestamp.toISOString();
            break;
          case 'opened':
            updateData.opened_at = timestamp.toISOString();
            break;
          case 'clicked':
            updateData.clicked_at = timestamp.toISOString();
            break;
          case 'bounced':
            updateData.bounced_at = timestamp.toISOString();
            break;
        }
      }

      await supabase
        .from('email_logs')
        .update(updateData)
        .eq('resend_id', resendId);
    } catch (error) {
      console.error('Email status update failed:', error);
    }
  }

  /**
   * Kullanıcının son e-postalarını getir
   */
  static async getUserEmailHistory(
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('email_logs')
      .select('template, subject, status, sent_at, opened_at, clicked_at')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Rate limit kontrolü için son gönderilenleri say
   */
  static async getRecentEmailCount(
    recipient: string,
    minutes: number
  ): Promise<number> {
    try {
      const supabase = createServiceRoleClient();

      const since = new Date(Date.now() - minutes * 60 * 1000);

      const { count, error } = await supabase
        .from('email_logs')
        .select('*', { count: 'exact', head: true })
        .eq('recipient', recipient)
        .gte('sent_at', since.toISOString());

      if (error) throw error;
      return count || 0;
    } catch (error) {
      // Migration uygulanmadan önce tablo olmayabilir; email gönderimini bloklamayalım.
      console.warn('Email rate-limit count failed (skipping):', error);
      return 0;
    }
  }
}

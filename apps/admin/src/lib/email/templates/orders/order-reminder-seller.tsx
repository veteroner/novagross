import * as React from 'react';
import { Section, Text, Button } from '@react-email/components';
import { EmailLayout } from '../base/layout';

interface OrderReminderSellerEmailProps {
  orderNumber: string;
  dueDateLabel: string;
  isOverdue: boolean;
  panelUrl: string;
}

/**
 * Satıcıya sipariş faturası hatırlatması/eskalasyonu (invoice-reminders cron'u
 * kullanır — bkz apps/admin/src/app/api/invoices/reminders/route.ts).
 */
export default function OrderReminderSellerEmail({
  orderNumber = 'NS-2026-001',
  dueDateLabel = '21 Temmuz 2026',
  isOverdue = false,
  panelUrl = 'https://seller.novagross.com/siparisler',
}: OrderReminderSellerEmailProps) {
  return (
    <EmailLayout
      preview={
        isOverdue
          ? `#${orderNumber} faturası gecikti — hemen yükleyin`
          : `#${orderNumber} faturası için son gün yaklaşıyor`
      }
    >
      <Section style={{ ...heroSection, backgroundColor: isOverdue ? '#fef2f2' : '#fffbeb' }}>
        <Text style={{ ...heroTitle, color: isOverdue ? '#991b1b' : '#92400e' }}>
          {isOverdue ? '⚠️ Fatura Yükleme Süresi Geçti' : '⏰ Fatura Yükleme Hatırlatması'}
        </Text>
        <Text style={heroSubtitle}>
          <strong>#{orderNumber}</strong> numaralı siparişin e-Arşiv faturası henüz sisteme
          yüklenmedi.
        </Text>
      </Section>

      <Text style={paragraph}>
        {isOverdue ? (
          <>
            Yasal yükleme süresi (kargolamadan itibaren 7 gün) <strong>{dueDateLabel}</strong>{' '}
            tarihinde doldu. Lütfen faturayı en kısa sürede yükleyin.
          </>
        ) : (
          <>
            Yasal yükleme süreniz <strong>{dueDateLabel}</strong> tarihinde doluyor. Faturayı
            zamanında yüklemeniz gerekir.
          </>
        )}
      </Text>

      <Section style={buttonContainer}>
        <Button style={{ ...button, backgroundColor: isOverdue ? '#dc2626' : '#f59e0b' }} href={panelUrl}>
          Faturayı Yükle
        </Button>
      </Section>

      <Text style={footer}>
        Novagross Satıcı Paneli
      </Text>
    </EmailLayout>
  );
}

const heroSection = {
  textAlign: 'center' as const,
  padding: '32px 24px',
  borderRadius: '8px',
  marginBottom: '32px',
};

const heroTitle = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const heroSubtitle = {
  fontSize: '16px',
  color: '#475569',
  margin: 0,
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#374151',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const button = {
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const footer = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#6b7280',
  marginTop: '32px',
};

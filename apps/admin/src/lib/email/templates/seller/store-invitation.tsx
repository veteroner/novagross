import * as React from 'react';
import { Section, Text, Button } from '@react-email/components';
import { EmailLayout } from '../base/layout';

interface StoreInvitationEmailProps {
  storeName: string;
  roleLabel: string;
  acceptUrl: string;
}

export default function StoreInvitationEmail({
  storeName = 'Örnek Mağaza',
  roleLabel = 'Personel',
  acceptUrl = 'https://seller.novagross.com/davet/xxx',
}: StoreInvitationEmailProps) {
  return (
    <EmailLayout preview={`${storeName} sizi ekibe davet etti`}>
      <Section style={heroSection}>
        <Text style={heroTitle}>🤝 Ekibe Davet Edildiniz</Text>
        <Text style={heroSubtitle}>
          <strong>{storeName}</strong> mağazasını <strong>{roleLabel}</strong> rolüyle yönetmeniz için
          davet edildiniz.
        </Text>
      </Section>

      <Text style={paragraph}>
        Daveti kabul etmek için aşağıdaki bağlantıya tıklayın. Novagross hesabınız yoksa önce hızlıca
        oluşturabilirsiniz; hesabınızın e-postası bu davetin gönderildiği adresle aynı olmalıdır.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={acceptUrl}>
          Daveti Kabul Et
        </Button>
      </Section>

      <Text style={note}>Bu davet 7 gün içinde geçerliliğini yitirir.</Text>

      <Text style={footer}>
        Novagross Satıcı Paneli
      </Text>
    </EmailLayout>
  );
}

const heroSection = {
  textAlign: 'center' as const,
  padding: '32px 24px',
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  marginBottom: '32px',
};
const heroTitle = { fontSize: '26px', fontWeight: 'bold', color: '#166534', margin: '0 0 12px 0' };
const heroSubtitle = { fontSize: '16px', color: '#475569', margin: 0 };
const paragraph = { fontSize: '16px', lineHeight: '26px', color: '#374151' };
const buttonContainer = { textAlign: 'center' as const, margin: '24px 0' };
const button = {
  backgroundColor: '#16A34A',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  display: 'inline-block',
  padding: '12px 32px',
};
const note = { fontSize: '13px', color: '#6b7280', textAlign: 'center' as const };
const footer = { fontSize: '14px', lineHeight: '24px', color: '#6b7280', marginTop: '32px' };

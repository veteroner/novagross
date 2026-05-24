// Base Email Layout Components

import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

// Email base styles
export const emailStyles = {
  main: {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  container: {
    margin: '0 auto',
    padding: '20px 0',
    maxWidth: '600px',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: '30px 20px',
    textAlign: 'center' as const,
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
  },
  logo: {
    margin: '0 auto',
  },
  content: {
    backgroundColor: '#ffffff',
    padding: '30px 40px',
  },
  footer: {
    backgroundColor: '#ffffff',
    padding: '20px 40px 30px',
    textAlign: 'center' as const,
    borderBottomLeftRadius: '8px',
    borderBottomRightRadius: '8px',
  },
  footerText: {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    margin: '8px 0',
  },
  button: {
    backgroundColor: '#0070f3',
    borderRadius: '6px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    lineHeight: '1',
    padding: '12px 24px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    cursor: 'pointer',
  },
  link: {
    color: '#0070f3',
    textDecoration: 'underline',
  },
  hr: {
    border: 'none',
    borderTop: '1px solid #e6ebf1',
    margin: '20px 0',
  },
};

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://novagross.com';
  
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={emailStyles.main}>
        <Container style={emailStyles.container}>
          {/* Header */}
          <Section style={emailStyles.header}>
            <Img
              src={`${siteUrl}/logo.png`}
              width="150"
              height="50"
              alt="Novagross"
              style={emailStyles.logo}
            />
          </Section>

          {/* Content */}
          <Section style={emailStyles.content}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={emailStyles.footer}>
            <Text style={emailStyles.footerText}>
              Bu e-posta <strong>Novagross</strong> tarafından gönderilmiştir.
            </Text>
            <Text style={emailStyles.footerText}>
              Teknova tarafından işletilmektedir.
            </Text>
            <Text style={emailStyles.footerText}>
              Sorularınız için:{' '}
              <Link href={`mailto:${process.env.CONTACT_EMAIL || 'info@novagross.com'}`} style={emailStyles.link}>
                {process.env.CONTACT_EMAIL || 'info@novagross.com'}
              </Link>
            </Text>
            <Text style={emailStyles.footerText}>
              <Link href={`${siteUrl}/privacy`} style={emailStyles.link}>
                Gizlilik Politikası
              </Link>
              {' • '}
              <Link href={`${siteUrl}/terms`} style={emailStyles.link}>
                Kullanım Koşulları
              </Link>
            </Text>
            <Text style={emailStyles.footerText}>
              © {new Date().getFullYear()} Novagross. Tüm hakları saklıdır.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Reusable components
interface ButtonProps {
  href: string;
  children: React.ReactNode;
}

export function Button({ href, children }: ButtonProps) {
  return (
    <Link href={href} style={emailStyles.button}>
      {children}
    </Link>
  );
}

interface InfoBoxProps {
  title: string;
  items: { label: string; value: string }[];
}

export function InfoBox({ title, items }: InfoBoxProps) {
  return (
    <Section style={{
      backgroundColor: '#f6f9fc',
      padding: '20px',
      borderRadius: '6px',
      marginTop: '20px',
      marginBottom: '20px',
    }}>
      {title && (
        <Text style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>
          {title}
        </Text>
      )}
      {items.map((item, index) => (
        <Text key={index} style={{ margin: '8px 0', fontSize: '14px', color: '#525f7f' }}>
          <strong>{item.label}:</strong> {item.value}
        </Text>
      ))}
    </Section>
  );
}

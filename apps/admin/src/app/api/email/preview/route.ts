// API Route: Email Template Preview
// GET /api/email/preview?template=auth/password-reset

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const template = searchParams.get('template');

    if (!template) {
      return NextResponse.json(
        { error: 'Template parameter is required' },
        { status: 400 }
      );
    }

    // Sample data for preview
    const sampleData = getSampleData(template);

    // Load template
    let TemplateComponent;
    
    switch (template) {
      case 'auth/password-reset':
        const { default: PasswordReset } = await import('@/lib/email/templates/auth/password-reset');
        TemplateComponent = PasswordReset;
        break;
      case 'auth/password-changed':
        const { default: PasswordChanged } = await import('@/lib/email/templates/auth/password-changed');
        TemplateComponent = PasswordChanged;
        break;
      case 'auth/otp-code':
        const { default: OtpCode } = await import('@/lib/email/templates/auth/otp-code');
        TemplateComponent = OtpCode;
        break;
      case 'orders/order-confirmation':
        const { default: OrderConfirmation } = await import('@/lib/email/templates/orders/order-confirmation');
        TemplateComponent = OrderConfirmation;
        break;
      case 'orders/new-order-seller':
        const { default: NewOrderSeller } = await import('@/lib/email/templates/orders/new-order-seller');
        TemplateComponent = NewOrderSeller;
        break;
      default:
        return NextResponse.json(
          { error: `Unknown template: ${template}` },
          { status: 404 }
        );
    }

    // Render HTML
    const { render } = await import('@react-email/render');
    const html = await render((TemplateComponent as any)(sampleData));

    // Return HTML for browser preview
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error: any) {
    console.error('Email preview error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to preview email template' },
      { status: 500 }
    );
  }
}

// Sample data for different templates
function getSampleData(template: string): Record<string, any> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  switch (template) {
    case 'auth/password-reset':
      return {
        resetUrl: `${baseUrl}/reset-password?token=sample_token_123`,
        userName: 'Ahmet Yılmaz',
        requestedAt: new Date().toLocaleString('tr-TR'),
        ipAddress: '192.168.1.1',
        deviceLabel: 'Chrome on Windows',
        expiresInMinutes: 15,
      };

    case 'auth/password-changed':
      return {
        userName: 'Ahmet Yılmaz',
        changedAt: new Date().toLocaleString('tr-TR'),
        ipAddress: '192.168.1.1',
        deviceLabel: 'Chrome on Windows',
      };

    case 'auth/otp-code':
      return {
        userName: 'Ahmet Yılmaz',
        otpCode: '483 921',
        purpose: 'Giriş doğrulama',
        requestedAt: new Date().toLocaleString('tr-TR'),
        ipAddress: '192.168.1.1',
        deviceLabel: 'Chrome on macOS',
        expiresInMinutes: 10,
      };

    case 'orders/order-confirmation':
      return {
        orderNumber: '12345',
        orderDate: new Date().toLocaleDateString('tr-TR'),
        items: [
          {
            name: 'Örnek Ürün 1',
            image: `${baseUrl}/placeholder-product.jpg`,
            quantity: 2,
            price: 299.99,
          },
          {
            name: 'Örnek Ürün 2',
            image: `${baseUrl}/placeholder-product.jpg`,
            quantity: 1,
            price: 149.99,
          },
        ],
        totalAmount: 749.97,
        shippingAddress: 'Atatürk Caddesi No:123, Kadıköy, İstanbul',
        orderUrl: `${baseUrl}/orders/12345`,
        trackingUrl: `${baseUrl}/orders/12345/track`,
      };

    case 'orders/new-order-seller':
      return {
        storeName: 'Novagross - Demo Mağaza',
        orderNumber: '12345',
        orderDate: new Date().toLocaleString('tr-TR'),
        buyerName: 'Ahmet Yılmaz',
        items: [
          { name: 'Örnek Ürün 1', quantity: 2, price: 299.99 },
          { name: 'Örnek Ürün 2', quantity: 1, price: 149.99 },
        ],
        subtotalAmount: 749.97,
        adminOrderUrl: `${baseUrl}/admin/orders/12345`,
      };

    default:
      return {
        message: 'Bu template için örnek veri henüz eklenmemiş.',
      };
  }
}

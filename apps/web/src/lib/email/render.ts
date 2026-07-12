type RenderResult = { subject?: string; html: string };

function escapeHtml(value: any): string {
  const s = String(value ?? '');
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderList(items: any[] | undefined): string {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return '<p>Ürün bulunamadı.</p>';

  const rows = list
    .map((i) => {
      const name = escapeHtml(i?.name);
      const qty = escapeHtml(i?.quantity);
      const price = escapeHtml(i?.price);
      return `<tr><td style="padding:6px 0;">${name}</td><td style="padding:6px 0; text-align:right;">${qty}</td><td style="padding:6px 0; text-align:right;">${price}</td></tr>`;
    })
    .join('');

  return `
    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr>
          <th style="text-align:left; padding:6px 0; border-bottom:1px solid #eee;">Ürün</th>
          <th style="text-align:right; padding:6px 0; border-bottom:1px solid #eee;">Adet</th>
          <th style="text-align:right; padding:6px 0; border-bottom:1px solid #eee;">Tutar</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export function renderEmailTemplate(template: string, data: Record<string, any>): RenderResult {
  const orderNumber = escapeHtml(data?.orderNumber);
  const orderDate = escapeHtml(data?.orderDate);

  switch (template) {
    case 'orders/order-confirmation': {
      const total = escapeHtml(data?.totalAmount);
      const shipping = escapeHtml(data?.shippingAddress);
      const orderUrl = escapeHtml(data?.orderUrl);

      return {
        html: `
          <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto; line-height:1.5; color:#111;">
            <h2 style="margin:0 0 12px;">Siparişiniz Alındı</h2>
            <p style="margin:0 0 8px;">Sipariş No: <strong>#${orderNumber}</strong></p>
            <p style="margin:0 0 16px;">Tarih: ${orderDate}</p>
            ${renderList(data?.items)}
            <p style="margin:16px 0 0;">Toplam: <strong>${total}</strong></p>
            ${shipping ? `<p style="margin:8px 0 0;">Teslimat: ${shipping}</p>` : ''}
            ${orderUrl ? `<p style="margin:16px 0 0;"><a href="${orderUrl}">Sipariş detayını görüntüle</a></p>` : ''}
            <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />
            <p style="margin:0; color:#666; font-size:12px;">Novagross</p>
          </div>
        `,
      };
    }

    case 'orders/new-order-seller': {
      const storeName = escapeHtml(data?.storeName);
      const subtotal = escapeHtml(data?.subtotalAmount);
      const adminOrderUrl = escapeHtml(data?.adminOrderUrl);

      return {
        html: `
          <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto; line-height:1.5; color:#111;">
            <h2 style="margin:0 0 12px;">Yeni Sipariş</h2>
            <p style="margin:0 0 8px;">Mağaza: <strong>${storeName}</strong></p>
            <p style="margin:0 0 8px;">Sipariş No: <strong>#${orderNumber}</strong></p>
            <p style="margin:0 0 16px;">Tarih: ${orderDate}</p>
            ${renderList(data?.items)}
            <p style="margin:16px 0 0;">Ara Toplam: <strong>${subtotal}</strong></p>
            ${adminOrderUrl ? `<p style="margin:16px 0 0;"><a href="${adminOrderUrl}">Siparişi panelde görüntüle</a></p>` : ''}
            <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />
            <p style="margin:0; color:#666; font-size:12px;">Novagross</p>
          </div>
        `,
      };
    }

    case 'marketing/product-offer': {
      const customerName = escapeHtml(data?.customerName || 'Değerli Müşterimiz');
      const productName = escapeHtml(data?.productName);
      const productUrl = escapeHtml(data?.productUrl);
      const storeName = escapeHtml(data?.storeName);
      const discountValue = escapeHtml(data?.discountValue);
      const couponCode = escapeHtml(data?.couponCode);
      const expiresAt = escapeHtml(data?.expiresAt);

      return {
        html: `
          <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto; line-height:1.5; color:#111; max-width:560px; margin:0 auto;">
            <h2 style="margin:0 0 12px;">Size Özel Bir Fırsat! 🎁</h2>
            <p style="margin:0 0 8px;">Merhaba ${customerName},</p>
            <p style="margin:0 0 16px;">İlgilendiğiniz <strong>${productName}</strong> için ${storeName} size özel <strong>%${discountValue} indirim</strong> tanımladı.</p>
            <div style="background:#FFF4EC; border:2px dashed #FF6000; border-radius:10px; padding:16px; text-align:center; margin:16px 0;">
              <p style="margin:0 0 4px; font-size:12px; color:#9a5b2d;">İndirim Kodunuz</p>
              <p style="margin:0; font-size:24px; font-weight:bold; letter-spacing:2px; color:#FF6000;">${couponCode}</p>
              ${expiresAt ? `<p style="margin:6px 0 0; font-size:12px; color:#9a5b2d;">Son kullanım: ${expiresAt}</p>` : ''}
            </div>
            ${productUrl ? `<p style="text-align:center; margin:20px 0;"><a href="${productUrl}" style="background:#FF6000; color:#fff; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:bold;">Ürüne Git ve Kodu Kullan</a></p>` : ''}
            <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />
            <p style="margin:0; color:#888; font-size:12px;">Kod tek kullanımlıktır ve yalnızca size özeldir. Ödeme adımında "Kupon Kodu" alanına girin.</p>
          </div>
        `,
      };
    }

    // Fallback: still send something instead of failing the whole queue item
    default: {
      return {
        html: `
          <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto; line-height:1.5; color:#111;">
            <h2 style="margin:0 0 12px;">Novagross Bildirimi</h2>
            <p style="margin:0 0 12px;">Şablon: <code>${escapeHtml(template)}</code></p>
            <pre style="white-space:pre-wrap; background:#f7f7f7; padding:12px; border-radius:8px;">${escapeHtml(
              JSON.stringify(data || {}, null, 2)
            )}</pre>
            <p style="margin:12px 0 0; color:#666; font-size:12px;">Bu e-posta sistemsel bir bildiridir.</p>
          </div>
        `,
      };
    }
  }
}

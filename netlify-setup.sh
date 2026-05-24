#!/bin/bash

# 🚀 Novagross - Netlify Deployment Hızlı Setup
# Bu script Netlify environment variables'larını kolayca kopyalamanız için

echo "═══════════════════════════════════════════════════════"
echo "🚀 Novagross Netlify Deployment Setup"
echo "═══════════════════════════════════════════════════════"
echo ""

echo "📋 Admin Panel Environment Variables"
echo "────────────────────────────────────────────────────────"
echo "Site: admin.novagross.com"
echo "Repo: https://github.com/veteroner/novastoreadmin"
echo ""
echo "Netlify Dashboard → Site Settings → Environment Variables → Add"
echo ""
cat << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://mdyecmjlxswprbpdtohg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SERVICE_ROLE_KEY>

NEXT_PUBLIC_SITE_URL=https://admin.novagross.com
NEXT_PUBLIC_ADMIN_URL=https://admin.novagross.com
NEXT_PUBLIC_WEB_SITE_URL=https://novagross.com

RESEND_API_KEY=<YOUR_RESEND_API_KEY>
RESEND_FROM_EMAIL=bildirim@novagross.com
RESEND_FROM_NAME=Novagross
EOF

echo ""
echo "────────────────────────────────────────────────────────"
echo ""
echo "📋 Web Sitesi Environment Variables"
echo "────────────────────────────────────────────────────────"
echo "Site: novagross.com"
echo "Repo: Bu repo (apps/web)"
echo ""
cat << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://mdyecmjlxswprbpdtohg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SERVICE_ROLE_KEY>

NEXT_PUBLIC_SITE_URL=https://novagross.com
NEXT_PUBLIC_ADMIN_URL=https://admin.novagross.com

IYZICO_API_KEY=<YOUR_IYZICO_API_KEY>
IYZICO_SECRET_KEY=<YOUR_IYZICO_SECRET_KEY>
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com

RESEND_API_KEY=<YOUR_RESEND_API_KEY>
RESEND_FROM_EMAIL=Novagross <bildirim@novagross.com>
RESEND_FROM_NAME=Novagross

EMAIL_QUEUE_PROCESSOR_SECRET=<GENERATE_RANDOM_SECRET>
EOF

echo ""
echo "────────────────────────────────────────────────────────"
echo ""
echo "🌍 DNS Kayıtları (Domain Sağlayıcınızda)"
echo "────────────────────────────────────────────────────────"
echo ""
echo "Type    | Name  | Value"
echo "--------|-------|----------------------------------------"
echo "CNAME   | @     | novagross.netlify.app"
echo "CNAME   | www   | novagross.netlify.app"
echo "CNAME   | admin | admin-teknovastore.netlify.app"
echo ""
echo "Not: Netlify'dan farklı CNAME değeri alırsanız onu kullanın"
echo ""

echo "────────────────────────────────────────────────────────"
echo ""
echo "✅ Yapılacaklar Listesi"
echo "────────────────────────────────────────────────────────"
echo ""
echo "1. [ ] Netlify'da iki site oluştur:"
echo "       - admin.novagross.com (novastoreadmin repo)"
echo "       - novagross.com (bu repo/apps/web)"
echo ""
echo "2. [ ] DNS kayıtlarını ekle (yukarıdaki tablo)"
echo ""
echo "3. [ ] Environment variables'ları ekle (yukarıdaki listeler)"
echo ""
echo "4. [ ] Supabase Auth URL'lerini güncelle:"
echo "       Site URL: https://novagross.com"
echo "       Redirect URLs:"
echo "         - https://novagross.com/**"
echo "         - https://admin.novagross.com/**"
echo ""
echo "5. [ ] Resend domain verification yap:"
echo "       Domain: novagross.com"
echo "       DNS kayıtlarını ekle (Resend'den alacaksınız)"
echo ""
echo "6. [ ] Test et:"
echo "       - https://novagross.com"
echo "       - https://admin.novagross.com"
echo "       - Satıcı başvurusu"
echo "       - Email gönderimi"
echo ""
echo "═══════════════════════════════════════════════════════"
echo "✨ Setup tamamlandığında her şey hazır olacak!"
echo "═══════════════════════════════════════════════════════"

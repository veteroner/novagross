/**
 * iyzico Alt Üye İşyeri Kayıt Scripti
 * 
 * Marketplace hesabında her mağazayı iyzico'da sub-merchant olarak kaydeder.
 * Dönen subMerchantKey'i stores tablosuna yazar.
 * 
 * Kullanım: node register-sub-merchants.js
 */

const Iyzipay = require('iyzipay');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const IYZICO_API_KEY = process.env.IYZICO_API_KEY;
const IYZICO_SECRET_KEY = process.env.IYZICO_SECRET_KEY;
const IYZICO_BASE_URL = process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com';

const iyzipay = new Iyzipay({
  apiKey: IYZICO_API_KEY,
  secretKey: IYZICO_SECRET_KEY,
  uri: IYZICO_BASE_URL,
});

async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }
  return res.json();
}

function createSubMerchant(request) {
  return new Promise((resolve, reject) => {
    iyzipay.subMerchant.create(request, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env variables required');
    console.log('Usage: NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node register-sub-merchants.js');
    process.exit(1);
  }

  if (!IYZICO_API_KEY || !IYZICO_SECRET_KEY) {
    console.error('❌ IYZICO_API_KEY and IYZICO_SECRET_KEY env variables required');
    process.exit(1);
  }

  console.log('📦 Fetching stores from database...');
  const stores = await supabaseFetch('/stores?select=id,store_name,store_slug,email,phone,address,city,iban,tax_number,tax_office,company_name,account_holder,taxpayer_type,iyzico_sub_merchant_key,commission_rate&status=eq.active');
  
  console.log(`Found ${stores.length} active store(s)\n`);

  for (const store of stores) {
    console.log(`--- Store: ${store.store_name} (${store.id}) ---`);
    
    if (store.iyzico_sub_merchant_key) {
      console.log(`✅ Already registered: ${store.iyzico_sub_merchant_key}\n`);
      continue;
    }

    // Para gönderimi IBAN sahibinin adıyla yapılır; ad tutmazsa banka EFT'yi
    // reddeder. Yer tutucu TC/IBAN ile ASLA kayıt açma — eksik bilgide atla.
    // Şirket mağazaları LIMITED_OR_JOINT_STOCK_COMPANY + legalCompanyTitle =
    // bankadaki hesap sahibi adı ile kaydedilmeli. (Admin'de satıcı detayındaki
    // "iyzico Alt Üye İşyeri" kartı aynı kaydı önizlemeli yapar — tercih edilen yol.)
    const isCompany = ['limited_company', 'joint_stock_company'].includes(store.taxpayer_type);
    const legalCompanyTitle = (store.account_holder || store.company_name || '').trim();
    const iban = (store.iban || '').replace(/\s/g, '').toUpperCase();
    const missing = [];
    if (!isCompany) missing.push('taxpayer_type şirket değil (bireysel kayıt TC kimlik no gerektirir, desteklenmiyor)');
    if (!legalCompanyTitle) missing.push('account_holder/company_name');
    if (!/^\d{10}$/.test(store.tax_number || '')) missing.push('tax_number (10 hane VKN)');
    if (!store.tax_office) missing.push('tax_office');
    if (!/^TR\d{24}$/.test(iban)) missing.push('iban');
    if (!store.email) missing.push('email');
    if (!store.phone) missing.push('phone');
    if (!store.address) missing.push('address');
    if (missing.length > 0) {
      console.error(`❌ Atlandı — eksik/uygunsuz: ${missing.join(', ')}\n`);
      continue;
    }

    const subMerchantType = 'LIMITED_OR_JOINT_STOCK_COMPANY';
    const request = {
      locale: 'tr',
      conversationId: `reg_${store.id.substring(0, 8)}`,
      subMerchantExternalId: store.id,
      subMerchantType,
      address: store.address,
      email: store.email,
      gsmNumber: store.phone,
      name: store.store_name,
      iban,
      currency: 'TRY',
      taxNumber: store.tax_number,
      taxOffice: store.tax_office,
      legalCompanyTitle,
    };

    console.log('Registering with iyzico...');
    console.log('Type:', subMerchantType);
    
    try {
      const result = await createSubMerchant(request);
      
      if (result.status === 'success') {
        console.log(`✅ Registered! subMerchantKey: ${result.subMerchantKey}`);
        
        // Save to database
        await supabaseFetch(`/stores?id=eq.${store.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ iyzico_sub_merchant_key: result.subMerchantKey }),
        });
        console.log('💾 Saved to database\n');
      } else {
        console.error(`❌ iyzico error: ${result.errorMessage}`);
        console.error('Error code:', result.errorCode);
        console.error('Full result:', JSON.stringify(result, null, 2));
        console.log('');
      }
    } catch (err) {
      console.error(`❌ Exception:`, err.message || err);
      console.log('');
    }
  }

  console.log('Done!');
}

main().catch(console.error);

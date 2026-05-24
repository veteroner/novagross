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
  const stores = await supabaseFetch('/stores?select=id,store_name,store_slug,email,phone,address,city,iban,tax_number,tax_office,company_name,iyzico_sub_merchant_key,commission_rate&status=eq.active');
  
  console.log(`Found ${stores.length} active store(s)\n`);

  for (const store of stores) {
    console.log(`--- Store: ${store.store_name} (${store.id}) ---`);
    
    if (store.iyzico_sub_merchant_key) {
      console.log(`✅ Already registered: ${store.iyzico_sub_merchant_key}\n`);
      continue;
    }

    // iyzico sub-merchant registration requires IBAN and identity/tax info
    // For PERSONAL type: identityNumber required
    // For PRIVATE_COMPANY: taxNumber + legalCompanyTitle required
    // For LIMITED_OR_JOINT_STOCK_COMPANY: taxNumber + taxOffice + legalCompanyTitle required

    const subMerchantType = store.tax_number && store.company_name 
      ? 'LIMITED_OR_JOINT_STOCK_COMPANY' 
      : 'PERSONAL';

    const request = {
      locale: 'tr',
      conversationId: `reg_${store.id.substring(0, 8)}`,
      subMerchantExternalId: store.id,
      subMerchantType,
      address: store.address || 'Istanbul, Turkey',
      email: store.email || 'info@novagross.com',
      gsmNumber: store.phone || '+905000000000',
      name: store.store_name,
      iban: store.iban || 'TR000000000000000000000000', // Placeholder - must be updated
      currency: 'TRY',
    };

    if (subMerchantType === 'PERSONAL') {
      request.identityNumber = '11111111111'; // Must be updated with real TC
      request.contactName = store.store_name;
      request.contactSurname = 'Store';
    } else {
      request.taxNumber = store.tax_number;
      request.taxOffice = store.tax_office || 'Istanbul';
      request.legalCompanyTitle = store.company_name || store.store_name;
    }

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

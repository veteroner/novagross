/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function parseDotEnv(content) {
  // Strip UTF-8 BOM if present
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }
  const out = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    let key = line.slice(0, eq).trim();
    if (key.startsWith('export ')) {
      key = key.slice('export '.length).trim();
    }
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      // Strip inline comments for unquoted values: KEY=value # comment
      const hashIdx = value.search(/\s#/);
      if (hashIdx !== -1) {
        value = value.slice(0, hashIdx).trim();
      }
    }
    out[key] = value;
  }
  return out;
}

function loadAdminEnv() {
  const candidates = [
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', '..', 'web', '.env.local'),
    path.join(__dirname, '..', '..', '..', '.env.local'),
  ];

  const merged = {};
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    Object.assign(merged, parseDotEnv(fs.readFileSync(envPath, 'utf8')));
  }

  return {
    url: merged.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: merged.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: merged.SUPABASE_SERVICE_ROLE_KEY,
  };
}

function cookieNameFromSupabaseUrl(url) {
  const host = new URL(url).hostname;
  const ref = host.split('.')[0];
  return `sb-${ref}-auth-token`;
}

function buildAuthCookieValue(session) {
  const json = JSON.stringify(session);
  const encoded = Buffer.from(json, 'utf8').toString('base64url');
  return `base64-${encoded}`;
}

async function assertOk(label, res) {
  if (!res.ok) {
    const text = await res.text().catch(() => '<no body>');
    throw new Error(`${label} HTTP ${res.status}: ${text}`);
  }
}

async function main() {
  const { url, anonKey, serviceRoleKey } = loadAdminEnv();
  if (!url || !anonKey || !serviceRoleKey) {
    // Fallback mode: run against existing seller+order (no service role needed).
    if (!url || !anonKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY eksik');
    }

    const email = process.env.SMOKE_SELLER_EMAIL;
    const password = process.env.SMOKE_SELLER_PASSWORD;
    const orderId = process.env.SMOKE_ORDER_ID;
    const carrierId = process.env.SMOKE_CARRIER_ID;
    const methodId = process.env.SMOKE_METHOD_ID;

    if (!email || !password || !orderId || !carrierId || !methodId) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY yok. Var olan verilerle test için şu envler gerekli: SMOKE_SELLER_EMAIL, SMOKE_SELLER_PASSWORD, SMOKE_ORDER_ID, SMOKE_CARRIER_ID, SMOKE_METHOD_ID'
      );
    }

    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    console.log('SMOKE: seller login…');
    const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    if (!signIn.session) throw new Error('session alınamadı (login başarısız?)');

    const cookieName = cookieNameFromSupabaseUrl(url);
    const cookieValue = buildAuthCookieValue(signIn.session);
    const baseUrl = process.env.ADMIN_BASE_URL || 'http://localhost:3001';

    console.log('SMOKE: POST /shipment (mock create)…');
    const createRes = await fetch(`${baseUrl}/api/seller/orders/${orderId}/shipment`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${cookieName}=${cookieValue}`,
      },
      body: JSON.stringify({
        carrierId,
        methodId,
        provider: 'mock',
        weight: 1,
        pieceCount: 1,
        createLabel: true,
      }),
    });
    await assertOk('create shipment', createRes);
    const createdShipment = await createRes.json();
    const trackingNumber = createdShipment?.shipment?.tracking_number;
    if (!trackingNumber) throw new Error('tracking_number dönmedi (shipment oluşturulamadı?)');

    console.log('SMOKE: GET /shipment…');
    const getRes = await fetch(`${baseUrl}/api/seller/orders/${orderId}/shipment`, {
      headers: { cookie: `${cookieName}=${cookieValue}` },
    });
    await assertOk('get shipment', getRes);
    const getBody = await getRes.json();
    if (!getBody?.shipment?.id) throw new Error('GET shipment boş döndü');

    console.log('SMOKE: PATCH /shipment (delivered)…');
    const patchRes = await fetch(`${baseUrl}/api/seller/orders/${orderId}/shipment`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        cookie: `${cookieName}=${cookieValue}`,
      },
      body: JSON.stringify({ status: 'delivered', location: 'Test', description: 'Smoke delivered' }),
    });
    await assertOk('patch shipment', patchRes);
    const patchBody = await patchRes.json();
    if (patchBody?.shipment?.status !== 'delivered') throw new Error('shipment status delivered olmadı');

    console.log('SMOKE: ✅ (fallback) create → get → delivered başarılı');
    return;
  }

  const service = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const stamp = Date.now();
  const email = `seller.smoke.${stamp}@example.com`;
  const password = `Test-${stamp}-A!`;
  let userId = null;
  let storeId = null;
  let orderId = null;

  console.log('SMOKE: temp seller oluşturuluyor…');
  const { data: created, error: createUserError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createUserError) throw createUserError;
  userId = created.user.id;

  await service.from('profiles').upsert({ id: userId, email, is_seller: true });

  const slug = `smoke-store-${stamp}`;
  const { data: store, error: storeError } = await service
    .from('stores')
    .insert({
      owner_id: userId,
      store_name: 'Smoke Store',
      store_slug: slug,
      status: 'active',
      email,
      phone: '+900000000000',
      city: 'Istanbul',
      district: 'Kadikoy',
    })
    .select('id')
    .single();
  if (storeError) throw storeError;
  storeId = store.id;

  const orderNumber = `SMOKE-${stamp}`;
  const shippingAddress = {
    full_name: 'Smoke Buyer',
    address: 'Test Mah. 1. Sokak No:1',
    city: 'Istanbul',
    district: 'Kadikoy',
    phone: '+900000000000',
  };

  const { data: order, error: orderError } = await service
    .from('orders')
    .insert({
      order_number: orderNumber,
      email: 'buyer.smoke@example.com',
      phone: '+900000000000',
      shipping_address: shippingAddress,
      subtotal: 100,
      total: 120,
      shipping_cost: 20,
      status: 'processing',
      primary_store_id: storeId,
      has_multiple_stores: false,
    })
    .select('id')
    .single();
  if (orderError) throw orderError;
  orderId = order.id;

  const { error: itemError } = await service.from('order_items').insert({
    order_id: orderId,
    store_id: storeId,
    name: 'Smoke Product',
    price: 100,
    quantity: 1,
    total: 100,
  });
  if (itemError) throw itemError;

  const { data: carrier, error: carrierError } = await service
    .from('shipping_carriers')
    .select('id')
    .limit(1)
    .maybeSingle();
  if (carrierError) throw carrierError;
  if (!carrier?.id) throw new Error('shipping_carriers boş görünüyor (seed eksik olabilir)');

  const { data: method, error: methodError } = await service
    .from('shipping_methods')
    .select('id')
    .limit(1)
    .maybeSingle();
  if (methodError) throw methodError;
  if (!method?.id) throw new Error('shipping_methods boş görünüyor (seed eksik olabilir)');

  console.log('SMOKE: temp seller ile login…');
  const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  if (!signIn.session) throw new Error('session alınamadı (login başarısız?)');

  const cookieName = cookieNameFromSupabaseUrl(url);
  const cookieValue = buildAuthCookieValue(signIn.session);
  const baseUrl = process.env.ADMIN_BASE_URL || 'http://localhost:3001';

  console.log('SMOKE: POST /shipment (mock create)…');
  const createRes = await fetch(`${baseUrl}/api/seller/orders/${orderId}/shipment`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: `${cookieName}=${cookieValue}`,
    },
    body: JSON.stringify({
      carrierId: carrier.id,
      methodId: method.id,
      provider: 'mock',
      weight: 1,
      pieceCount: 1,
      createLabel: true,
    }),
  });
  await assertOk('create shipment', createRes);
  const createdShipment = await createRes.json();
  const trackingNumber = createdShipment?.shipment?.tracking_number;
  if (!trackingNumber) throw new Error('tracking_number dönmedi (shipment oluşturulamadı?)');
  console.log('SMOKE: tracking ok:', trackingNumber);

  console.log('SMOKE: GET /shipment…');
  const getRes = await fetch(`${baseUrl}/api/seller/orders/${orderId}/shipment`, {
    headers: {
      cookie: `${cookieName}=${cookieValue}`,
    },
  });
  await assertOk('get shipment', getRes);
  const getBody = await getRes.json();
  if (!getBody?.shipment?.id) throw new Error('GET shipment boş döndü');

  console.log('SMOKE: PATCH /shipment (delivered)…');
  const patchRes = await fetch(`${baseUrl}/api/seller/orders/${orderId}/shipment`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      cookie: `${cookieName}=${cookieValue}`,
    },
    body: JSON.stringify({ status: 'delivered', location: 'Test', description: 'Smoke delivered' }),
  });
  await assertOk('patch shipment', patchRes);
  const patchBody = await patchRes.json();
  if (patchBody?.shipment?.status !== 'delivered') throw new Error('shipment status delivered olmadı');

  const { data: updatedOrder, error: updatedOrderError } = await service
    .from('orders')
    .select('status, tracking_number')
    .eq('id', orderId)
    .single();
  if (updatedOrderError) throw updatedOrderError;
  if (updatedOrder.status !== 'delivered') {
    throw new Error(`orders.status expected delivered, got ${updatedOrder.status}`);
  }
  if (!updatedOrder.tracking_number) {
    throw new Error('orders.tracking_number set edilmemiş');
  }

  console.log('SMOKE: ✅ kargo akışı başarılı (create → get → delivered + orders mirror)');

  // Cleanup best-effort
  console.log('SMOKE: cleanup…');
  await service.from('shipping_status_history').delete().eq('shipment_id', getBody.shipment.id);
  await service.from('order_shipments').delete().eq('order_id', orderId);
  await service.from('order_items').delete().eq('order_id', orderId);
  await service.from('orders').delete().eq('id', orderId);
  await service.from('stores').delete().eq('id', storeId);
  await service.from('profiles').delete().eq('id', userId);
  await service.auth.admin.deleteUser(userId);
}

main().catch((err) => {
  console.error('SMOKE: ❌', err);
  process.exitCode = 1;
});

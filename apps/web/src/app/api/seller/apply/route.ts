import { NextRequest, NextResponse } from 'next/server';
import { queueEmail } from '@/lib/email/queue';
import { createClient as createUserClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

function isValidEmail(email: string) {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)
}

function normalizeTrPhone(input: string) {
  const digits = input.replace(/\D/g, '')
  if (!digits) return ''

  // Accept:
  // - 10 digits (5xxxxxxxxx) -> 0 + 10 digits
  // - 11 digits starting with 0 -> keep
  // - 12 digits starting with 90 -> 0 + last 10 digits
  if (digits.length === 10) return `0${digits}`
  if (digits.length === 11 && digits.startsWith('0')) return digits
  if (digits.length === 12 && digits.startsWith('90')) return `0${digits.slice(2)}`
  return digits
}

function isValidTrPhone(phone: string) {
  // Same regex as DB validate_phone: (+90 or 0) optional then 10 digits
  return /^(\+90|0)?[0-9]{10}$/.test(phone)
}

function toSlug(input: string) {
  const map: Record<string, string> = {
    ç: 'c',
    Ç: 'c',
    ğ: 'g',
    Ğ: 'g',
    ı: 'i',
    I: 'i',
    İ: 'i',
    ö: 'o',
    Ö: 'o',
    ş: 's',
    Ş: 's',
    ü: 'u',
    Ü: 'u',
  };

  const replaced = input
    .trim()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('');

  return replaced
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.json();

    const {
      storeName,
      storeDescription,
      contactName,
      contactEmail,
      contactPhone,
      businessAddress,
      businessCity,
      businessState,
      businessPostalCode,
      taxNumber,
      companyName,
      bankName,
      bankAccountNumber,
      iban,
      accountHolder,
    } = formData;

    // Validate required fields
    if (!storeName || !contactEmail || !contactName) {
      return NextResponse.json(
        { error: 'Gerekli alanları doldurun' },
        { status: 400 }
      );
    }

    const email = String(contactEmail).trim()
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Geçerli bir e-posta adresi girin' },
        { status: 400 }
      )
    }

    const phone = normalizeTrPhone(String(contactPhone ?? '').trim())
    if (!phone || !isValidTrPhone(phone)) {
      return NextResponse.json(
        { error: 'Telefon formatı geçersiz. Örn: 05321234567 veya +905321234567' },
        { status: 400 }
      )
    }

    const supabase = await createUserClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error('Failed to read auth user:', userError);
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Başvuru göndermek için giriş yapmalısınız' },
        { status: 401 }
      );
    }

    const storeSlug = toSlug(String(storeName ?? ''));
    if (!storeSlug) {
      return NextResponse.json(
        { error: 'Mağaza adı geçersiz' },
        { status: 400 }
      );
    }

    const adminNotesParts: string[] = [];
    if (contactName) adminNotesParts.push(`İrtibat: ${contactName}`);
    if (bankAccountNumber) adminNotesParts.push(`Hesap No: ${bankAccountNumber}`);
    const adminNotes = adminNotesParts.length ? adminNotesParts.join('\n') : null;

    // Use service role client for insert to bypass RLS (user_id already validated above)
    const serviceSupabase = createServiceRoleClient();

    // Enforce: 1 kullanıcı = 1 mağaza
    const { data: existingStores, error: existingStoresError } = await serviceSupabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1);

    if (existingStoresError) {
      console.error('Failed to check existing stores:', existingStoresError);
      return NextResponse.json(
        { error: 'Mağaza kontrolü yapılamadı' },
        { status: 500 }
      );
    }

    if ((existingStores?.length ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Zaten bir mağazanız var. Aynı kullanıcı ile ikinci mağaza oluşturulamaz.' },
        { status: 409 }
      );
    }

    // Enforce: aynı kullanıcı için tek aktif başvuru
    const { data: existingApplications, error: existingApplicationsError } = await serviceSupabase
      .from('store_applications')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'under_review'])
      .limit(1);

    if (existingApplicationsError) {
      console.error('Failed to check existing applications:', existingApplicationsError);
      return NextResponse.json(
        { error: 'Başvuru kontrolü yapılamadı' },
        { status: 500 }
      );
    }

    if ((existingApplications?.length ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Zaten incelemede olan bir satıcı başvurunuz var.' },
        { status: 409 }
      );
    }

    // Create seller application
    const { data: application, error: insertError } = await serviceSupabase
      .from('store_applications')
      .insert({
        user_id: user.id,
        store_name: storeName,
        tax_number: taxNumber,
        store_slug: storeSlug,
        description: storeDescription,
        phone,
        email,
        address: businessAddress,
        city: businessCity,
        district: businessState,
        postal_code: businessPostalCode,
        company_name: companyName || null,
        bank_name: bankName || null,
        iban: iban ? iban.replace(/\s/g, '').toUpperCase() : null,
        account_holder: accountHolder || contactName || null,
        status: 'pending',
        admin_notes: adminNotes,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create application:', insertError);
      return NextResponse.json(
        { error: 'Başvuru kaydedilemedi' },
        { status: 500 }
      );
    }

    // Send confirmation email to applicant
    await queueEmail({
      to: contactEmail,
      subject: 'Novagross | Satıcı Başvurunuz Alındı',
      template: 'seller/application-received',
      priority: 'high',
      data: {
        applicantName: contactName,
        storeName,
        applicationId: application.id,
        estimatedReviewTime: '1-2 iş günü',
      },
    });

    // Notify admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@novagross.com';
    await queueEmail({
      to: adminEmail,
      subject: `Novagross | Yeni Satıcı Başvurusu - ${storeName}`,
      template: 'seller/application-received' as any,
      priority: 'medium',
      data: {
        storeName,
        contactName,
        contactEmail,
        contactPhone,
        applicationId: application.id,
        reviewUrl: `${process.env.NEXT_PUBLIC_ADMIN_URL}/saticilar/basvurular`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Başvurunuz başarıyla kaydedildi',
      applicationId: application.id,
    });
  } catch (error: any) {
    console.error('Seller application error:', error);
    return NextResponse.json(
      { error: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
